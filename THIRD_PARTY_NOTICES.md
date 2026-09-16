# Third-Party Notices

PHANTOM's original application code lives under `phantom/`, `frontend/`,
`scripts/`, and `video/phantom-promo/`. Third-party code and model artifacts
are isolated under `third_party/`.

## DouZero

- Project: DouZero — Mastering DouDizhu with Self-Play Deep Reinforcement Learning
- Authors: Daochen Zha et al.; Kwai AI Platform and Texas A&M University
- Source: https://github.com/kwai/DouZero
- Vendored revision: `718a5c920bf3361e34178a38f3b80458e176b351`
- License: Apache License 2.0
- Local license: `third_party/DouZero/LICENSE`
- Use in PHANTOM: unmodified game engine, observation encoder, neural model
  definitions, and pretrained base-policy checkpoints
- Paper: https://proceedings.mlr.press/v139/zha21a.html

PHANTOM does not claim authorship of DouZero. The external adapter under
`phantom/base/` reads DouZero's complete legal-action value vector without
modifying its upstream source.

## Build-time speech generation

- Tool: edge-tts 7.2.8
- Source: https://github.com/rany2/edge-tts
- License: GNU Lesser General Public License v3
- Use in PHANTOM: build-time generation of the bundled Mandarin announcer lines
- Runtime note: the browser demo plays local MP3 files and does not call an online speech service

## Casino Audio

- Pack: Casino Audio 1.1
- Author: Kenney Vleugels
- Source: https://kenney.nl/assets/casino-audio
- License: Creative Commons Zero 1.0
- Local license: `third_party/audio/kenney-casino-audio/License.txt`
- Use in PHANTOM: tactile card slides, card placement, shuffling, dealing and chip accents

## Happy Clappy Loop

- Track: Happy Clappy Loop
- Author: OwlishMedia
- Source: https://opengameart.org/content/happy-clappy-loop
- License: Creative Commons Zero 1.0
- Use in PHANTOM: cheerful, sample-accurate looping table music

## Impact Sounds

- Pack: Impact Sounds 1.0
- Author: Kenney Vleugels
- Source: https://kenney.nl/assets/impact-sounds
- License: Creative Commons Zero 1.0
- Local license: `third_party/audio/kenney-impact-sounds/License.txt`
- Use in PHANTOM: layered punch, bell and glass transients for bombs, rockets and spring

## Sci-fi Sounds

- Pack: Sci-fi Sounds 1.0
- Author: Kenney Vleugels
- Source: https://kenney.nl/assets/sci-fi-sounds
- License: Creative Commons Zero 1.0
- Local license: `third_party/audio/kenney-sci-fi-sounds/License.txt`
- Use in PHANTOM: low-frequency explosions, crunchy impacts and the rising rocket layer

## Mixkit cinematic impact layers

- Items: Big cinematic impact (788), Cinematic whoosh deep impact (1143), Cinematic mystery trailer drum hit (546)
- Source: https://mixkit.co/free-sound-effects/cinematic/
- License: Mixkit Sound Effects Free License
- License page: https://mixkit.co/license/
- Local provenance: `third_party/audio/mixkit-cinematic/README.md`
- Use in PHANTOM: organic low-frequency impact, air movement and drum transients for bombs and rockets

## OpenGameArt accent layer

- Source: Magic Spell SFX by JaggedStone
- Source page: https://opengameart.org/content/magic-spell-sfx
- License: Creative Commons Zero 1.0
- Local provenance: `third_party/audio/opengameart-cinematic/README.md`
- Use in PHANTOM: spring-result sparkle accent

The turn prompt and result flourishes are generated from the original synthesis
code in `scripts/generate_audio_assets.py`. Bomb and rocket playback combines
the Mixkit recordings above with real-card foley, tailored timing, music ducking
and smooth tail fades. The previous rocket-boost and magic-riser layers are no
longer shipped or referenced at runtime.

## Pretrained checkpoint mirror

The official project publishes pretrained checkpoints through Google Drive
and Baidu Netdisk. The automated Google Drive folder listing was unavailable
during setup, so the byte artifacts were retrieved from the following public
mirror, which identifies itself as a mirror of the original `baselines/`
directory:

- Mirror: https://huggingface.co/palemoky/douzero-baselines
- Mirror revision at retrieval: `57b3914046c2a0877016b8b8830fd07cf5b0ba08`
- License label: Apache-2.0
- Retrieved subset: `checkpoints/douzero_ADP/{landlord,landlord_up,landlord_down}.ckpt`

Checkpoint hashes are recorded in `STATUS.md` after local verification.

## RLCard

- Project: RLCard
- Source: https://github.com/datamllab/rlcard
- Installed version: 1.2.0
- License: MIT
- Use in PHANTOM: runtime dependency of DouZero
