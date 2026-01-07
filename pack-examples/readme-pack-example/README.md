# SIGame Example Pack

This is a complete example of a SIGame question pack structure, featuring:
-   **Full scope**: Covers round values from 100 to 500 for every category.
-   **Real media**: Includes sample audio, video, and image files.

## Structure

The pack contains:
-   **Round 1 - Music**: Audio questions and mashups.
-   **Round 2 - Video**: Video questions.
-   **Round 3 - Text**: Text questions with images.

## File Structure

```
readme-example/
├── Round 1 - Music/
│   ├── Pop - 100/          # Audio question
│   ├── Pop - 200/          # Mashup question
│   ├── Pop - 300/          # Audio question with video answer
│   ├── Pop - 400/          # Audio question with audio answer
│   ├── Pop - 500/          # Audio question
│   ├── Rock - 200/         # Betting question (special card)
│   ├── Rock - 300/         # Cat in a Bag (special card)
│   ├── Rock - 400/         # Auction question (special card)
│   └── ... (full 100-500)
├── Round 2 - Video/
│   ├── Movies - 100/       # Video question
│   └── ... (full 100-500)
└── Round 3 - Text/
    ├── History - 100/      # Text question
    └── ... (full 100-500)
```

## Media Files
All media files (`audio.mp3`, `video.mp4`, `image.jpg`) in this pack are **real sample files**. You can use them to test the functionality of your game immediately.

## Customization
To create your own pack:
1.  Copy the folder structure.
2.  Replace the media files with your own content.
3.  Update `question.txt` and `answer.txt` with your questions and answers.
4.  Ensure file naming conventions are strictly followed:
    -   `audio.mp3`, `video.mp4` for main question media.
    -   `questionImage.jpg`, `questionVideo.mp4`, `questionAudio.mp3` for extra question media.
    -   `answerImage.jpg`, `answerVideo.mp4`, `answerAudio.mp3` for answer media.
