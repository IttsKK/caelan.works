import type { AppBreakdown } from "../types/site";

import icon from "../assets/work/reader-icon.webp";
import read from "../assets/apps/reader/read.webp";
import listening from "../assets/apps/reader/listening.webp";
import question from "../assets/apps/reader/question.webp";
import answered from "../assets/apps/reader/answered.webp";
import written from "../assets/apps/reader/written.webp";
import paper from "../assets/apps/reader/paper.webp";
import importing from "../assets/apps/reader/import.webp";
import dayOne from "../assets/apps/reader/day-one.webp";
import launch from "../assets/apps/reader/launch.webp";
import android from "../assets/apps/reader/android.webp";
import directionPaper from "../assets/apps/reader/direction-paper.webp";
import directionGraphite from "../assets/apps/reader/direction-graphite.webp";
import directionNight from "../assets/apps/reader/direction-night.webp";
import directionMarker from "../assets/apps/reader/direction-marker.webp";

/**
 * Write-ups of apps, each at /apps/<slug>. These are about the app itself;
 * its website, if it has one, is a normal entry in `projects.ts`.
 *
 * Screens are real captures at the device's own size (1206×2622 for iPhone).
 */
export const apps: AppBreakdown[] = [
  {
    slug: "reader",
    title: "Reader",
    icon,
    summary: "How Reader works and how I built it: a reading app for iPhone, Mac and Android, from first mockups to the App Store in eleven days.",
    intro: [
      "Reader is an app I built for myself, initially to read texts for school assignments. At its core, it's just a simple reading app with on-device voice models, customizable themes, and different reading styles. What makes it different from other reading apps is the active recall features: every so often it stops and asks a few questions about what you just read, and you have to think of the answer before it shows you the choices. The ones worth keeping come back a few days later. It's how I do my class readings now, and I actually remember them afterwards instead of just getting to the end.",
      "I designed and built all of it: the iPhone and Mac app, the Android app, and the server behind the questions. It went from the first mockups to the App Store in eleven days.",
    ],
    facts: [
      { label: "Year", value: "2026" },
      { label: "Platforms", value: "iPhone, Mac and Android" },
      { label: "Built with", value: "SwiftUI, Jetpack Compose, Cloudflare Workers, Claude" },
      { label: "Get it", value: "reader.caelan.works/get", href: "https://reader.caelan.works/get" },
    ],
    screens: [
      { src: read, alt: "A page of text with the current phrase highlighted in amber and playback controls at the bottom", caption: "The guide moving through the text" },
      { src: listening, alt: "The Listening panel: read aloud on, speed 1.0×, the Heart voice", caption: "Listening settings" },
      { src: question, alt: "A checkpoint asking how much Ebbinghaus had forgotten within an hour, with a Show Options button", caption: "A checkpoint question" },
      { src: answered, alt: "The same checkpoint answered: More than half, marked correct, with a short explanation", caption: "The answer, with a short explanation" },
    ],
    sections: [
      {
        title: "How it works",
        items: [
          {
            term: "Read",
            text: "A guide moves through the text at the pace you set: a phrase at a time, a sweep along the line, or a whole line. Tap any word to move it there. Scrolling never loses your place.",
          },
          {
            term: "Listen",
            text: "A natural voice reads it aloud on the device, highlighting each word as it's said. It keeps going with the screen off, and you can go back and forth between reading and listening without losing your spot.",
          },
          {
            term: "Checkpoints",
            text: "At natural breaks it stops and asks a few questions about what you just read. Multiple choice hides the options until you've thought of an answer. Written answers are graded on what you meant, not the exact words, with a hint if you're close.",
          },
          {
            term: "Review",
            text: "Questions come back on a spaced schedule, so the ones you missed show up sooner. No streaks, no scores.",
          },
        ],
        figures: [
          {
            kind: "phones",
            images: [
              { src: written, alt: "A written answer, spacing effect, marked correct", caption: "A written answer" },
              { src: importing, alt: "Your turn: add a link, paste text, or import a file", caption: "Adding something to read" },
              { src: paper, alt: "Reading in the Paper theme, warm off-white with dark text", caption: "The Paper theme" },
              { src: android, alt: "The reader on Android, with the same serif text and amber play button", caption: "The Android app" },
            ],
          },
        ],
      },
      {
        title: "How it's built",
        body: [
          "iPhone and Mac share one SwiftUI app and a Swift package that does the real work: importing articles, PDFs and YouTube transcripts, pacing the guide, deciding where checkpoints go, grading, and scheduling review. Android is its own Jetpack Compose app rather than a wrapped web view. Its core is a line-for-line translation of the Swift package, tests included, so both read and write the same library files.",
          "The questions come from a small Cloudflare Worker. Claude Sonnet writes them and Haiku grades written answers. Every multiple-choice question is also answered blind by a second model, and thrown out if it doesn't match the key. The server keeps usage and cost, never the text you're reading.",
          "The voices run on the device: Kokoro through FluidAudio on Apple, sherpa-onnx on Android. The word highlighting follows the model's own timing for each sound, not a timer, so it stays in sync at any speed.",
        ],
        items: [
          { term: "Swift", text: "About 15,000 lines across the app and the shared package, plus 1,900 of tests" },
          { term: "Kotlin", text: "About 9,400 lines, plus 700 of tests" },
          { term: "TypeScript", text: "About 2,200 lines for the server" },
        ],
      },
      {
        title: "How it came together",
        items: [
          {
            term: "Research and mockups",
            text: "Started by looking at apps I like using (Bear, Raycast, Flighty, GoodLinks and a few others) and what they have in common, and reading up on how memory works. Then four visual directions. Night Study won, and five rounds of mockups after that settled the checkpoint: full screen, with the options hidden until you've thought.",
          },
          {
            term: "First build",
            text: "The first real build: the guide, checkpoints, the natural voice, sync, imports, review and the Mac layout. I also tested a dozen models on writing questions and moved from Opus to Sonnet, which cut the cost of each checkpoint by about 60%.",
          },
          {
            term: "Android",
            text: "A native Android version, so friends without iPhones could test it. Then open sign-up with 100 free checkpoints a month, and long books handled by writing questions just ahead of where you're reading.",
          },
          {
            term: "Cutting back",
            text: "A lot of cutting. A Learn tab, a study mode and a three-column Mac library all went. What was left got written down as rules: one main action per screen, amber for one thing, and the word \"AI\" nowhere in the app.",
          },
          {
            term: "The first text",
            text: "The first thing you open became a short piece called Why You Forget What You Read. It explains the idea behind the app by being read in it, and its questions are written by hand, so the first checkpoint shows up within a minute, offline, for free.",
          },
          {
            term: "App Store prep",
            text: "Getting ready for the App Store: account deletion, one plain consent question before anything is sent, screenshots made from UI tests, and a notarized Mac download that updates itself.",
          },
          {
            term: "Launch",
            text: "Live on the App Store. Then 1.0.1 on all three platforms, which taught the voices to tell \"read\" from \"read\", and about 600 other words like it.",
          },
        ],
        figures: [
          {
            kind: "phones",
            images: [
              { src: directionPaper, alt: "Mockup of the reading screen in the Paper direction: warm off-white with an amber highlight", caption: "Paper" },
              { src: directionGraphite, alt: "Mockup of the reading screen in the Graphite direction: cool grey with a blue accent", caption: "Graphite" },
              { src: directionNight, alt: "Mockup of the reading screen in the Night Study direction: dark charcoal with an amber guide", caption: "Night Study, the one I went with" },
              { src: directionMarker, alt: "Mockup of the reading screen in the Highlighter direction: light with a yellow marker highlight", caption: "Highlighter" },
            ],
          },
          {
            kind: "phones",
            images: [
              { src: dayOne, alt: "The reader on the first day: plain text and basic controls", caption: "The first build" },
              { src: launch, alt: "The reader at launch: the guide highlight, a progress bar split by checkpoints, and the amber play button", caption: "Version 1.0" },
            ],
          },
        ],
      },
      {
        title: "Decisions",
        items: [
          {
            term: "No AI in the interface",
            text: "It writes and checks the questions, but there's no chat, no summaries and no sparkles. I wanted it to strengthen what your brain is already doing rather than do the reading for you.",
          },
          {
            term: "Think before you see the choices",
            text: "Picking from a list is recognition, which is easy. Coming up with the answer first is recall, which is what actually makes it stick.",
          },
          {
            term: "Nothing to keep up with",
            text: "No streaks, scores or counts. When the free questions run out they just stop, quietly. Reading never waits on them.",
          },
          {
            term: "Amber means one thing",
            text: "It's only for the guide, progress, the voice when it's on, and the one main button on each screen. Everything else steps back so the text is the interface.",
          },
          {
            term: "Native on each platform",
            text: "Liquid Glass controls on iPhone and Mac, Android's own switches and back behaviour, and the same serif and colours on all of them.",
          },
        ],
      },
      {
        title: "Hard parts",
        items: [
          {
            term: "Wrong answer keys",
            text: "A review of 162 generated questions found 6 with the wrong answer marked. A blind second pass, about a cent per text, caught all six, so it now runs on every question.",
          },
          {
            term: "Long books",
            text: "Sending a 57,000-word book in one request was slow and expensive. Now the device works out where checkpoints go, for free, and questions are written two checkpoints ahead of you. Hume's Enquiry costs about four cents to import and set up the first two checkpoints, and the first one is ready in 23 seconds.",
          },
          {
            term: "Saying words right",
            text: "Words like read, live and close sound different depending on how they're used. I ported a part-of-speech tagger to Swift and Kotlin and matched its tags to the voice's own dictionary. Android needed respellings instead, because its voice engine works differently.",
          },
          {
            term: "Two apps, one library",
            text: "iPhone and Android write the same files, so dates, IDs and even default values have to match exactly, or one app can't read the other's answers.",
          },
        ],
      },
    ],
    next: { label: "Reader's website", href: "/work/reader" },
  },
];
