# Optional AI models for Lumity Gallery

These files are **not** needed by the gallery. They are only fetched when the
user presses **Download** next to an AI model in the Enhance dialog, and are
then kept in the browser (IndexedDB) so AI upscaling also works offline.
They can also be loaded from disk with **Load model files…**.

| Engine in the app | Files | Size |
|---|---|---|
| AI · Fast | `realesr-animevideov3-x4.param` / `.bin` | 1.2 MB |
| AI · Best | `realesrgan-x4plus-anime.param` / `.bin` | 8.9 MB |

Source: the official Real-ESRGAN ncnn release
`realesrgan-ncnn-vulkan-20220424` (Real-ESRGAN v0.2.5.0,
https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0), files copied
unchanged from its `models/` folder. The release's `-x2`/`-x3` animevideov3
files contain the same weights as `-x4` (only a final downscale differs), so
only `-x4` is included; the app resizes on the GPU.

Real-ESRGAN © 2021 Xintao Wang, BSD 3-Clause License — see
`LICENSE-Real-ESRGAN.txt`.

SHA-256:

```
850a248e7c14c27e5bd8cf7265113a9441036a7db63963bb8aa5169d788a435e  realesr-animevideov3-x4.param
2b8fb6e0ae4d2d85704ca08c119a2f5ea40add4f2ecd512eb7f4cd44b6127ed4  realesrgan-x4plus-anime.param
548a36f9c3f4ab8da56cd3b13badf23968bee207b396dad14d04b830e5f2ab2d  realesr-animevideov3-x4.bin
fe01c269cfd10cdef8e018ab66ebe750cf79c7af4d1f9c16c737e1295229bacc  realesrgan-x4plus-anime.bin
```
