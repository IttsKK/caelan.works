/*
 * The board editor, at `/?edit` while `bun run dev` is running.
 *
 * Move photos by hand, or let it help: put photos next to ones of a similar
 * colour, scatter them into free space, nudge overlapping ones apart, or
 * regroup the whole board by colour and adjust from there. Drop image files
 * on the page to add them. Save writes positions to
 * `src/data/photos.json` (see `editor-server.mjs`), so the change is just a
 * file you commit.
 */

import type { BoardApi, Print } from "./board";

type Snapshot = Map<Print, { x: number; y: number; rot: number; z: number }>;

const VIEW_KEY = "board-editor:view";
const NEW_KEY = "board-editor:new";

export function startEditor(api: BoardApi) {
  const { prints, board } = api;
  const selected = new Set<Print>();
  const history: Snapshot[] = [];
  let dirty = false;
  let message = "";

  document.documentElement.classList.add("is-editing");
  document.querySelector<HTMLElement>(".arrange")?.setAttribute("hidden", "");

  // ── Toolbar ──

  const bar = document.createElement("div");
  bar.className = "editor";
  bar.innerHTML = `
    <div class="editor__row">
      <button type="button" data-act="undo" title="Undo (⌘Z)">Undo</button>
      <span class="editor__sep"></span>
      <button type="button" data-act="suggest" title="Move to sit beside photos of a similar colour">Place near similar</button>
      <button type="button" data-act="scatter" title="Drop into random free spots in view">Scatter</button>
      <button type="button" data-act="tidy" title="Push overlapping photos apart">Nudge apart</button>
      <button type="button" data-act="regroup" title="Lay out every photo in colour groups">Regroup all</button>
      <span class="editor__sep"></span>
      <label class="editor__set">Add to <select data-upload-set></select></label>
      <span class="editor__sep"></span>
      <button type="button" data-act="save" class="editor__save" title="Save (⌘S)">Save</button>
    </div>
    <div class="editor__row editor__row--info">
      <span data-status></span>
    </div>
    <p class="editor__hint">Drag to move · shift-click or shift-drag to select several · [ ] or alt + scroll to rotate · arrows to nudge · drop images to add</p>
  `;
  document.body.append(bar);
  const status = bar.querySelector<HTMLElement>("[data-status]")!;
  const saveButton = bar.querySelector<HTMLButtonElement>("[data-act='save']")!;
  const uploadSet = bar.querySelector<HTMLSelectElement>("[data-upload-set]")!;
  const SET_KEY = "board-editor:set";
  uploadSet.innerHTML =
    api.sets.map((set) => `<option value="${set}">${set}</option>`).join("") + `<option value="__new">New set…</option>`;
  uploadSet.value = sessionStorage.getItem(SET_KEY) ?? api.sets[0] ?? "photos";
  if (!uploadSet.value) uploadSet.value = api.sets[0] ?? "photos";
  uploadSet.addEventListener("change", () => {
    if (uploadSet.value === "__new") {
      const name = window.prompt("Name the new set (it becomes a folder)")?.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
      if (name) {
        uploadSet.insertAdjacentHTML("afterbegin", `<option value="${name}">${name}</option>`);
        uploadSet.value = name;
      } else uploadSet.value = api.sets[0] ?? "photos";
    }
    sessionStorage.setItem(SET_KEY, uploadSet.value);
  });

  const marquee = document.createElement("div");
  marquee.className = "editor-marquee";
  marquee.hidden = true;
  document.body.append(marquee);

  const dropHint = document.createElement("div");
  dropHint.className = "editor-drop";
  dropHint.textContent = "Drop to add photos";
  window.addEventListener("dragenter", () => (dropHint.textContent = `Drop to add to ${uploadSet.value}`));
  dropHint.hidden = true;
  document.body.append(dropHint);

  // ── State helpers ──

  const isNew = (print: Print) => print.saved.x === undefined || print.saved.y === undefined;

  const update = () => {
    for (const print of prints) {
      print.el.classList.toggle("is-selected", selected.has(print));
      print.el.classList.toggle("is-new", isNew(print));
    }
    saveButton.classList.toggle("is-dirty", dirty);
    saveButton.textContent = dirty ? "Save •" : "Saved";

    const parts: string[] = [];
    if (message) parts.push(message);
    else if (selected.size) parts.push(`${selected.size} selected`);
    else parts.push(`${prints.length} photos`);
    const unplaced = prints.filter(isNew).length;
    if (unplaced) parts.push(`${unplaced} not saved in place yet`);
    status.textContent = parts.join(" · ");
  };

  const say = (text: string) => {
    message = text;
    update();
    window.setTimeout(() => {
      if (message === text) {
        message = "";
        update();
      }
    }, 2600);
  };

  const snapshot = (): Snapshot =>
    new Map(prints.map((p) => [p, { x: p.home.x, y: p.home.y, rot: p.home.rot, z: p.z }]));

  /** Remember the board before a change, so it can be undone. */
  const checkpoint = () => {
    history.push(snapshot());
    if (history.length > 80) history.shift();
  };

  const changed = () => {
    dirty = true;
    api.refresh();
    update();
  };

  const undo = () => {
    const last = history.pop();
    if (!last) return say("Nothing to undo");
    for (const [print, s] of last) {
      print.home = { x: s.x, y: s.y, rot: s.rot };
      print.z = s.z;
    }
    changed();
  };

  const topZ = () => Math.max(0, ...prints.map((p) => p.z)) + 1;
  const targets = () => (selected.size ? [...selected] : prints.filter(isNew));

  // ── Actions ──

  /** Put each photo beside the photos of the most similar colour. */
  const suggest = () => {
    const moving = targets();
    if (!moving.length) return say("Select photos first");
    checkpoint();
    const others = prints.filter((p) => !moving.includes(p));
    for (const print of moving) {
      const spot = api.suggestSpot(print, others.length ? others : prints.filter((p) => p !== print));
      print.home = { x: spot.x, y: spot.y, rot: (Math.random() - 0.5) * 10 };
      print.z = topZ();
      others.push(print);
    }
    changed();
    say(`Placed ${moving.length} near similar colours`);
  };

  /** Drop each photo into a random free spot in view. */
  const scatter = () => {
    const moving = targets();
    if (!moving.length) return say("Select photos first");
    checkpoint();
    const corner = api.toWorld(0, 0);
    const far = api.toWorld(window.innerWidth, window.innerHeight);
    const others = prints.filter((p) => !moving.includes(p));
    for (const print of moving) {
      const x = corner.x + (far.x - corner.x) * (0.15 + Math.random() * 0.7);
      const y = corner.y + (far.y - corner.y) * (0.15 + Math.random() * 0.7);
      const spot = api.freeSpot(print, x, y, others);
      print.home = { x: spot.x, y: spot.y, rot: (Math.random() - 0.5) * 14 };
      print.z = topZ();
      others.push(print);
    }
    changed();
  };

  /** Push overlapping photos apart, moving only the selected ones if there are any. */
  const tidy = () => {
    checkpoint();
    const movable = new Set(selected.size ? selected : prints);
    const unit = api.unit();
    for (let round = 0; round < 60; round++) {
      let moved = false;
      for (let i = 0; i < prints.length; i++) {
        for (let j = i + 1; j < prints.length; j++) {
          const a = prints[i];
          const b = prints[j];
          if (!movable.has(a) && !movable.has(b)) continue;
          const dx = b.home.x - a.home.x;
          const dy = b.home.y - a.home.y;
          const ox = ((api.boardW(a) + api.boardW(b)) / 2) * 1.08 - Math.abs(dx);
          const oy = ((api.boardH(a) + api.boardH(b)) / 2) * 1.08 - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          moved = true;
          const [sa, sb] = [movable.has(a) ? 1 : 0, movable.has(b) ? 1 : 0];
          const share = sa + sb;
          if (ox / api.boardW(a) < oy / api.boardH(a)) {
            const push = (ox / share) * (dx < 0 ? -1 : 1);
            a.home.x -= push * sa;
            b.home.x += push * sb;
          } else {
            const push = (oy / share) * (dy < 0 ? -1 : 1);
            a.home.y -= push * sa;
            b.home.y += push * sb;
          }
        }
      }
      if (!moved) break;
    }
    changed();
  };

  /** Lay the whole board out in colour groups, as a starting point to adjust. */
  const regroup = () => {
    if (!window.confirm("Regroup every photo by colour? This moves everything (you can undo).")) return;
    checkpoint();
    for (const [print, spot] of api.autoLayout()) {
      print.home = { x: spot.x, y: spot.y, rot: spot.rot };
      print.z = spot.z;
    }
    changed();
  };

  const save = async () => {
    const unit = api.unit();
    const body = prints.map((p) => ({
      file: p.file,
      x: p.home.x / unit,
      y: p.home.y / unit,
      rot: p.home.rot,
      z: p.z,
    }));
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(api.view()));
    const res = await fetch("/__editor/save", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) return say(`Couldn't save: ${(await res.json()).error ?? res.status}`);
    for (const p of prints) p.saved = { x: p.home.x / unit, y: p.home.y / unit, rot: p.home.rot, z: p.z };
    sessionStorage.removeItem(NEW_KEY);
    dirty = false;
    say("Saved to src/data/photos.json");
  };

  bar.addEventListener("click", (event) => {
    const act = (event.target as HTMLElement).closest<HTMLElement>("[data-act]")?.dataset.act;
    if (act === "undo") undo();
    else if (act === "suggest") suggest();
    else if (act === "scatter") scatter();
    else if (act === "tidy") tidy();
    else if (act === "regroup") regroup();
    else if (act === "save") save();
  });

  // ── Selecting and dragging ──

  let drag: { id: number; start: { x: number; y: number }; from: Map<Print, { x: number; y: number }>; moved: boolean } | null =
    null;

  for (const print of prints) {
    print.el.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      if (event.shiftKey) {
        if (selected.has(print)) selected.delete(print);
        else selected.add(print);
        update();
        return;
      }
      if (!selected.has(print)) {
        selected.clear();
        selected.add(print);
      }
      drag = {
        id: event.pointerId,
        start: api.toWorld(event.clientX, event.clientY),
        from: new Map([...selected].map((p) => [p, { x: p.home.x, y: p.home.y }])),
        moved: false,
      };
      print.el.setPointerCapture(event.pointerId);
      update();
    });
    print.el.addEventListener("pointermove", (event) => {
      if (drag?.id !== event.pointerId) return;
      const at = api.toWorld(event.clientX, event.clientY);
      const dx = at.x - drag.start.x;
      const dy = at.y - drag.start.y;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) * api.view().zoom < 3) return;
        drag.moved = true;
        checkpoint();
        const z = topZ();
        for (const p of drag.from.keys()) p.z = z;
      }
      for (const [p, from] of drag.from) {
        p.home.x = from.x + dx;
        p.home.y = from.y + dy;
      }
      api.refresh();
    });
    const end = (event: PointerEvent) => {
      if (drag?.id !== event.pointerId) return;
      if (drag.moved) changed();
      drag = null;
    };
    print.el.addEventListener("pointerup", end);
    print.el.addEventListener("pointercancel", end);
  }

  // Shift-drag on empty space draws a selection box; a plain click there
  // clears the selection. A plain drag still pans the board.
  let box: { id: number; x: number; y: number } | null = null;
  let downOnEmpty: { x: number; y: number } | null = null;
  board.addEventListener(
    "pointerdown",
    (event) => {
      if ((event.target as HTMLElement).closest("[data-print]")) return;
      downOnEmpty = { x: event.clientX, y: event.clientY };
      if (!event.shiftKey || event.button !== 0) return;
      event.stopPropagation();
      box = { id: event.pointerId, x: event.clientX, y: event.clientY };
      board.setPointerCapture(event.pointerId);
      marquee.hidden = false;
      Object.assign(marquee.style, { left: `${box.x}px`, top: `${box.y}px`, width: "0px", height: "0px" });
    },
    { capture: true },
  );
  board.addEventListener("pointermove", (event) => {
    if (box?.id !== event.pointerId) return;
    const left = Math.min(box.x, event.clientX);
    const top = Math.min(box.y, event.clientY);
    Object.assign(marquee.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.abs(event.clientX - box.x)}px`,
      height: `${Math.abs(event.clientY - box.y)}px`,
    });
  });
  board.addEventListener("pointerup", (event) => {
    if (box?.id === event.pointerId) {
      const x0 = Math.min(box.x, event.clientX);
      const x1 = Math.max(box.x, event.clientX);
      const y0 = Math.min(box.y, event.clientY);
      const y1 = Math.max(box.y, event.clientY);
      for (const print of prints) {
        const c = api.toScreen(print.home.x, print.home.y);
        if (c.x >= x0 && c.x <= x1 && c.y >= y0 && c.y <= y1) selected.add(print);
      }
      box = null;
      marquee.hidden = true;
      update();
      return;
    }
    if (downOnEmpty && Math.hypot(event.clientX - downOnEmpty.x, event.clientY - downOnEmpty.y) < 4) {
      selected.clear();
      update();
    }
    downOnEmpty = null;
  });

  // ── Keys and wheel ──

  const rotate = (degrees: number) => {
    if (!selected.size) return;
    checkpoint();
    for (const p of selected) p.home.rot = Math.max(-45, Math.min(45, p.home.rot + degrees));
    changed();
  };

  const nudge = (dx: number, dy: number) => {
    checkpoint();
    const unit = api.unit();
    for (const p of selected) {
      p.home.x += dx * unit;
      p.home.y += dy * unit;
    }
    changed();
  };

  window.addEventListener(
    "keydown",
    (event) => {
      if ((event.target as HTMLElement | null)?.closest?.("input, textarea")) return;
      const mod = event.metaKey || event.ctrlKey;
      const step = event.shiftKey ? 0.25 : 0.04;
      let handled = true;
      if (mod && event.key.toLowerCase() === "z") undo();
      else if (mod && event.key.toLowerCase() === "s") save();
      else if (mod && event.key.toLowerCase() === "a") {
        prints.forEach((p) => selected.add(p));
        update();
      } else if (event.key === "Escape") {
        selected.clear();
        update();
      } else if (event.key === "[") rotate(event.shiftKey ? -10 : -3);
      else if (event.key === "]") rotate(event.shiftKey ? 10 : 3);
      else if (selected.size && event.key === "ArrowLeft") nudge(-step, 0);
      else if (selected.size && event.key === "ArrowRight") nudge(step, 0);
      else if (selected.size && event.key === "ArrowUp") nudge(0, -step);
      else if (selected.size && event.key === "ArrowDown") nudge(0, step);
      else handled = false;
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    { capture: true },
  );

  // Alt + scroll rotates the selection instead of zooming.
  let wheelRot = 0;
  window.addEventListener(
    "wheel",
    (event) => {
      if (!event.altKey || !selected.size) return;
      event.preventDefault();
      event.stopPropagation();
      if (!wheelRot) checkpoint();
      for (const p of selected) p.home.rot = Math.max(-45, Math.min(45, p.home.rot + event.deltaY * 0.05));
      window.clearTimeout(wheelRot);
      wheelRot = window.setTimeout(() => (wheelRot = 0), 300);
      changed();
    },
    { capture: true, passive: false },
  );

  // ── Adding photos ──

  let dragDepth = 0;
  const hasFiles = (event: DragEvent) => [...(event.dataTransfer?.types ?? [])].includes("Files");
  window.addEventListener("dragenter", (event) => {
    if (!hasFiles(event)) return;
    dragDepth++;
    dropHint.hidden = false;
  });
  window.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dropHint.hidden = true;
  });
  window.addEventListener("dragover", (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener("drop", async (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    dropHint.hidden = true;
    const files = [...(event.dataTransfer?.files ?? [])].filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f.name));
    if (!files.length) return say("Only JPEG, PNG, WebP or AVIF images");
    // Saving first, since adding files reloads the page.
    if (dirty) await save();
    const added: string[] = [];
    for (const [i, file] of files.entries()) {
      say(`Adding ${i + 1} of ${files.length}…`);
      const query = `name=${encodeURIComponent(file.name)}&set=${encodeURIComponent(uploadSet.value)}`;
      const res = await fetch(`/__editor/upload?${query}`, { method: "POST", body: file });
      if (res.ok) added.push((await res.json()).file);
    }
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(api.view()));
    sessionStorage.setItem(NEW_KEY, JSON.stringify(added));
    // The dev server takes a moment to notice new files; wait until the page
    // includes them before reloading.
    say("Processing…");
    for (let tries = 0; tries < 40; tries++) {
      const html = await fetch(location.href, { cache: "no-store" }).then((r) => r.text()).catch(() => "");
      if (added.every((file) => html.includes(`data-file="${file}"`))) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    location.reload();
  });

  window.addEventListener("beforeunload", (event) => {
    if (dirty) event.preventDefault();
  });

  // ── Outlines that stay the same width at any zoom ──

  const drawnWidth = new Map<Print, string>();
  const outlines = () => {
    const zoom = api.view().zoom;
    for (const print of prints) {
      if (!selected.has(print) && !isNew(print)) continue;
      const scale = print.boardScale * zoom || 1;
      const width = (1.5 / scale).toFixed(2);
      if (drawnWidth.get(print) !== width) {
        drawnWidth.set(print, width);
        print.el.style.setProperty("--edit-line", `${width}px`);
      }
    }
    requestAnimationFrame(outlines);
  };
  requestAnimationFrame(outlines);

  // ── Start ──

  // Come back to the same view after saving or adding photos reloads the page.
  const view = JSON.parse(sessionStorage.getItem(VIEW_KEY) ?? "null");
  if (view) api.setView(view.x, view.y, view.zoom);
  // Kept until the next save, since adding files can reload the page twice.
  const added: string[] = JSON.parse(sessionStorage.getItem(NEW_KEY) ?? "[]").filter((file: string) =>
    prints.some((p) => p.file === file && isNew(p)),
  );
  if (added.length) {
    for (const print of prints) if (added.includes(print.file)) selected.add(print);
    dirty = true;
    message = `Added ${added.length}, placed near similar colours. Save to keep.`;
    window.setTimeout(() => {
      message = "";
      update();
    }, 4000);
  }
  if (prints.some(isNew) && !added.length) dirty = true;
  api.setCursorLabel("");
  update();
}
