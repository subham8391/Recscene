# Screen Studio 3.7.3 — complete feature and settings inventory

Installed build: **3.7.3 (4475)**. Update offered: 4.1.0 (5005).

Sources, in order of authority:
1. `project.json` inside the open project bundle (every per-project setting and its current value, 70 keys)
2. `settings-persistance.json` in Application Support (every app preference, 55 keys)
3. The full UI string table and asset list extracted from `app.asar`
4. A live capture of the editor window
5. The official guide, used only for items marked **[4.x]** or **[guide]**

Legend: ✅ confirmed in the installed build · **[guide]** website only, not found in the build · **[4.x]** newer version only

---

## A. Per-project settings (project.json → config)

Every value below is editable in the editor sidebar. Current values are from the open project "Area 2026-11-14 00:12:01".

### Background & Screen
| Setting | Key | Options / range | Current |
|---|---|---|---|
| Background type | backgroundType | gradient, color, image, system (wallpaper) | gradient |
| Gradient | backgroundGradient | start/end points, colour stops (35 presets in UI) | #03045E → #CAF0F8 |
| Background colour | backgroundColor | any hex | #3F37C9 |
| Background image | backgroundImage | file path or null | none |
| Wallpaper | backgroundSystemName | 180 bundled images in Energy, Glassmorphism, Iridescent, Midnight, Radiant, Raycast, Spring, Sunset, macOS | macOS/tahoe-light |
| Background blur | backgroundBlur | 0–n (blurs the background image, not the camera) | 0 |
| Padding | backgroundPaddingRatio | slider | 10 |
| Rounded corners | windowBorderRadius | slider | 10 |
| Shadow intensity | shadowIntensity | 0–1 | 0.75 |
| Shadow angle | shadowAngle | degrees | 90 |
| Shadow distance | shadowDistance | px | 25 |
| Shadow blur | shadowBlur | px | 20 |
| Directional shadow | shadowIsDirectional | on/off (off for very large recordings) | off |
| Inset | insetPadding | top/right/bottom/left | 0 |
| Inset colour | insetColor | hex | #000000 |
| Inset opacity | insetAlpha | 0–1 | 0.5 |
| Output aspect ratio | defaultOutputAspectRatio | original, 16:9, 1:1, 9:16, custom | original |
| Crop | recordingCrop | x, y, width, height (0–1) | full |
| Device mockup | enableDeviceMockup | on/off | on |
| Device frame | deviceFrameKey | ~150 frames (MacBook Air/Pro, iMac 24" ×7 colours, Studio Display, Pro Display XDR, iPad Air/Mini/Pro incl. M4, iPhone 11 → 17 Pro Max and iPhone Air, iPhone SE) | none |
| Fit mockup to recording | adjustDeviceFrameToRecordingSize | on/off | on |

### Cursor
| Setting | Key | Options | Current |
|---|---|---|---|
| Cursor style set | cursorSet.id | macos, macos-tahoe, touch, halloween, custom-1 … custom-20 | macos-tahoe |
| Cursor size | cursorSize | multiplier | 1.5 |
| Hide cursor | hideCursor | on/off | off |
| Smooth cursor movement | disableMouseMovementSpring | on/off | on (smooth) |
| Cursor movement physics | mouseMovementSpring | stiffness, damping, mass (presets Smooth 470/70/3, Medium 340/60/3, Rapid 530/40/1, None; "Customize" opens Rigidity / Smoothness / Momentum sliders) | 470 / 70 / 3 |
| Click animation physics | mouseClickSpring | stiffness, damping, mass | 700 / 30 / 1 |
| Rotate cursor while moving | cursorRotateOnXMovementRatio | 0–1 | 0.5 |
| Base rotation | cursorBaseRotation | degrees | 0 |
| Always use pointer cursor | alwaysUseDefaultCursor | on/off | off |
| Sharp cursor fallback | useDefaultCursorIfAppCursorHasLowResolution | on/off | on |
| Optimize cursor changes | optimizeOriginalCursorTypes | on/off | on |
| Hide cursor when idle | hideNotMovingCursorAfterMs | ms or off | off |
| Loop cursor position | loopCursorPositionBeforeEndMs | ms or off | off |
| Stop cursor at end | stopCursorMovementInLastPartMs | ms | 0 |
| Remove cursor shakes | removeCurshorShakeTreshold | threshold | 500 |
| Click effect | clickEffect | none, circle, ripple | none |
| Click sound | clickSoundEffect | none, Apple Magic Mouse, Logitech MX Master | none |
| Click sound volume | clickSoundEffectVolume | 0–1 | 0.25 |
| Motion blur | motionBlurAmount | 0–1 | 1 |
| Motion blur: cursor | motionBlurCursorAmount | 0–1 (advanced) | 1 |
| Motion blur: screen move | motionBlurScreenMoveAmount | 0–1 (advanced) | 1 |
| Motion blur: screen zoom | motionBlurScreenZoomAmount | 0–1 (advanced) | 1 |

### Zoom (per zoom range in scenes[].zoomRanges)
| Setting | Key | Options |
|---|---|---|
| Zoom type | type | follow-click-groups (Auto), follow-mouse, manual |
| Zoom level | zoom | multiplier (default 1.135 from app prefs) |
| Manual target | manualTargetPoint | x, y |
| Snap to edges | snapToEdgesRatio | 0–1 |
| Glide | glideDirection, glideSpeed | stored keys only; no editor control found in 3.7.3 |
| Instant animation | hasInstantAnimation | on/off |
| Disabled | isDisabled | on/off |
| System-generated | isSystem | flag for automatic zooms |
| Always keep zoomed in | config.alwaysKeepZoomedIn | on/off |
| Screen movement physics | config.screenMovementSpring | stiffness, damping, mass (200 / 40 / 2.25) |

### Camera
| Setting | Key | Options | Current |
|---|---|---|---|
| Hide camera | hideCamera | on/off | off |
| Mirror horizontally | mirrorCamera | on/off | off |
| Shape | cameraAspectRatio | original, square | original |
| Roundness | cameraRoundness | 0–1 (1 = circle) | 0.25 |
| Size | cameraSize | 0–1 of frame | 0.35 |
| Size during zoom | cameraScaleDuringZoom | 0–1 | 0.7 |
| Position | cameraPosition / cameraPositionPoint | top-left, top-right, bottom-left, bottom-right, or free point | bottom-right |
| Default layout | defaultLayout.type | both, only-camera, only-screen (hiding the camera = only-screen) | both |
| Timeline layouts | scenes[].layouts | same three types, each with own size and position, start/end, disabled flag | none |

### Masks (scenes[].masks)
| Setting | Options |
|---|---|
| Mask type | sensitive-data, highlight |
| Region, start/end time, disabled flag, highlight opacity (apply to all) | |
| Masked content shift detection | app preference, experimental |

### Shortcut labels
| Setting | Key | Current |
|---|---|---|
| Show shortcuts | showShortcuts | off |
| Show single-key shortcuts | showShortcutsWithSingleLetters | off |
| Label size | shortcutsSizeRatio | 1 |

### Captions
| Setting | Key | Current |
|---|---|---|
| Show transcript / captions | showTranscript | on |
| Caption size | transcriptSizeRatio | 1 |
| Transcript engine | Whisper (local, 142 MB model) or Apple Speech Recognition | — |
| Languages | 60+ (English, Hindi, Bengali, Tamil, Telugu, Kannada, Gujarati, Urdu, Japanese, Chinese, Korean, Spanish, German, French … ) | — |

### Audio
| Setting | Key | Current |
|---|---|---|
| Master volume | audioVolume | 1 |
| Mute microphone | muteMicrophone | off |
| Mute system audio | muteSystemAudio | off |
| Mute external device audio | muteExternalDeviceAudio | off |
| Improve microphone audio (noise reduction + normalize) | improveMicrophoneAudio | off |
| Microphone stereo mode | microphoneInStereoMode | off (mono) |
| Background music file | backgroundAudioFileName | none (17 bundled tracks: lo-fi ×5, instrumental ×4, electronic ×4, commercial ×4, plus own library folder) |
| Mute background music | muteBackgroundAudio | off |
| Background music volume | backgroundAudioVolume | 0.05 |
| Voiceovers | scenes[].voiceOvers | recorded in-editor |

### Clips (scenes[].slices)
| Setting | Key |
|---|---|
| Speed | timeScale (audio muted above 2x) |
| Source range | sourceStartMs / sourceEndMs (trim) |
| Volume | volume, systemAudioVolume, externalDeviceAudioVolume |
| Hide cursor for clip | hideCursor |
| Disable smooth cursor for clip | disableSmoothMouseMovement |
| Typing speed-up suggestions | resolvedTypingSpeedIncreaseSuggestions |
| Recording range | config.recordingRange (overall trim) |
| Recording flags / markers | meta.recordingFlags, recording-markers.json |

---

## B. App preferences (settings-persistance.json) — all 55 keys

### General
- startAtStartup — start Screen Studio at login (off)
- hideDockIcon — hide dock icon (off)
- hideAppDockIconWhileRecording — hide dock icon only while recording (on)
- showRecordingWidget — floating recording controls (on)
- projectsFolderPath — ~/Screen Studio Projects
- presetsFolderPath — ~/Documents/Screen Studio Presets
- autoSaveProject — autosave every 30 s (on)
- useLastProjectConfigForNewProjects — last project settings as default (off)
- defaultPresetId — default preset for new projects (none)
- highlightSidebarNavigationLabels (on)
- enableSnow — seasonal UI effect (on)

### Recording
- recordingUseScreenCaptureKit — auto / modern / legacy engine (auto)
- recordingCountdownDuration — seconds or none (none)
- recordingAreaCover — dim outside recorded area (on)
- hideDesktopContentWhileRecording — hide desktop icons (off)
- createAutomaticZooms — generate zooms from clicks (on)
- enableVoiceRecordingEnhancements — mic enhancement during recording (off)
- actionAfterRecording — create-project (open editor) or quick export widget
- recordingWindowSizePresets — saved window sizes (empty)
- recordingAreaCropPresets — saved area dimensions (empty)
- maximumWebcamHeight — 720 / 1080 (1080)
- webcamPreviewType — square / full-frame (square)
- enableExternalDeviceRecording — iPhone/iPad over USB (off)
- enableAutoGainControl — mic AGC (on)

### Editor and playback
- defaultZoomLevel (1.135)
- playbackEnergyMode — high-performance / low-power
- playbackQualityMode — high-quality / lower
- playbackPreviewMaxHeight — preview size (1080)
- playbackLoop — loop playback (off)
- playbackAudioScrubber — experimental audio scrubbing (off)
- optimizePreviewRendering (on)
- enableSmoothWaveform (on)
- hideAudioWaveform (off)
- alwaysShowTimelineScrollbar (off)
- reelPreviewMode — Instagram/TikTok safe areas (off)
- showSpeakerNotes (off)
- detectMaskedContentShift — experimental (off)

### Export and sharing
- showQuickExportWidget — after recording (on)
- muteQuickExportWidgetPreview (off)
- actionAfterQuickExport — do-nothing / open project / etc.
- alwaysSaveProjectWhenUsingQuickExportWidget (off)
- editProjectTitleWhenUsingQuickExportWidget (off)
- useMultithreadedVideoEncoder (on)
- experimentalUseMultithreadedVideoEncoder (off)
- disableHardwareAcceleratedVideoEncodingAndDecoding (off)
- audioComposerMethod — swift-audio-composer / ffmpeg
- useExperimentalUploadFeatures — enhanced shareable-link upload (off)

### Advanced / developer
- logLevel (2), devMode, devForceUpdates, forcedFrontendUrl
- bypasNetworkCertificateValidation — skip certificate validation (off)
- enableExportDebugWindow, enableVideoDebugInfo, enableDebugWebcodecsInPreview, debugShareWidget

### Other persisted state
- auth, license, check-for-update, recent documents, window bounds, unfinished recordings (crash-recovery list)

---

## C. Export settings (export dialog and Quick Export defaults)
- Format: MP4 (H.264; HEVC/MOV/WebM codecs present in the encoder layer) or GIF (plays once; warns about size and time)
- Resolution: 480p, 720p, 1080p, 1440p, 4K (2160p)
- Frame rate: selectable; up to 60 fps **[guide]**
- Quality: Web (Low), Medium, High — "does not impact export speed"
- Export encoder: hardware (media engine) or software
- Target: Save to file, Copy to clipboard, Create shareable link
- Quick export to file / clipboard / link, with separate default settings
- Export current frame as image; copy current frame to clipboard
- Export transcript (.srt) **[guide for format]**
- Shareable links: Public or Private, video title, max duration limit, always exported at a fixed resolution, manage-links page, comments and view counts **[guide]**
- Project sharing: Copy and zip project (.screenstudio bundle); extract raw recording files (screen mp4, camera, mic, system audio, cursor, keystrokes, mouse data)

---

## D. Recording features (not stored as settings)
- Record entire display · single window (window picker, re-tracks moved windows) · area (drag, adjust, arrow-key nudge) · iPhone/iPad over USB (requires camera permission, "Trust" on device) · iPhone Mirroring **[guide]** · Create project from existing video
- Window picker can resize the target window to a saved preset size
- Per-recording toggles: webcam on/off (or record muted), microphone on/off, system audio off / all apps / selected apps, external device audio
- Countdown · Pause / Resume · Restart entire recording · Cancel · Finish
- Add recording marker · Create recording flag
- Speaker notes window with prompter (speed, opacity, start/stop; invisible to the recording)
- Global shortcut: Shift+Cmd+R start/stop; option to disable all shortcuts while recording
- Start/stop sounds · Low-disk-space auto-stop · Crash recovery ("Recover unfinished recordings")
- Recorder captures separately: screen video (0.5 scale on Retina), cursor images, mouse moves, mouse clicks, keystrokes, camera, mic, system audio, external device

---

## E. Editor commands (command menu / shortcuts guide)
Playback: Play/Pause · Play backward or increase speed · Stop and reset speed · Move forwards/backwards (and fast) · Go to first/last frame · Loop playback · Zoom in/out timeline
Clips: Split at current time · Cut slice · Remove slice · Remove slice before/till previous cut · Remove all slices · Join clips · Merge with previous/next · Set slice speed · Apply speed to all · Set slice volume (mic, system, device) · Hide cursor for slice · Disable smooth mouse for slice · Copy/paste slice settings · Reset trim · Reset all trims and cuts · Undo trim
Zooms: Add zoom (click/drag) · Add manual zoom · Set type Auto/Manual · Change zoom level · Increase/decrease zoom level · Apply zoom level to all · Toggle zoom disabled · Enable/disable all zoom ranges · Restore default zoom ranges · Duplicate · Copy/paste zoom range · Split zoom at current time · Remove zoom / all
Layouts: Add layout (screen, camera, both) · Edit default camera layout · Set layout mode default/fullscreen/hide · Move layout camera (3×3 grid positions) · Apply camera size to all layouts · Toggle layout disabled · Copy/paste layout · Split layout · Remove layout / all
Masks: Add sensitive data mask · Add highlight mask · Change mask type · Toggle mask disabled · Disable all masks · Apply opacity to all · Copy mask · Focus timeline on mask · Remove mask / all
Transcript: Generate / Re-generate / Edit / Update / Hide transcript · Export transcript
Audio: Add / remove / mute background audio · Mute mic / system / device · Set volumes · Toggle audio waveform · Toggle smooth waveform · Record voiceover
View: Toggle sidebar · Toggle timeline · Toggle preview · Enter preview mode · Reel mode · Visible timeline tracks · Always show scrollbar · Show speaker notes · Toggle recording widget
Project: Save · Save as · Open project · Open recent · Open last project · Create project from video · Show project in Finder · Copy and zip project · Extract raw recording files · Copy current frame as image · Export current frame · Remove project · Delete project
Presets: Create new preset · Apply preset to project / multiple projects · Use as default · Update to match project · Import preset · Remove / rename preset · Preset options
App: Show command menu (Cmd+K) · Show keyboard shortcuts · Settings · Check for updates · Open changelog · Open account dashboard · Manage shareable links · Manage subscription · Open purchase/renew page · Share diagnostics info · Send feedback · Reset onboarding / preferences / windows positions · Open app data folder · Open audio library folder · Quit

---

## F. Account, licensing, updates
- Activate by license key (36 chars) or by email verification code; SSO for enterprise teams; pick product/team when several are linked
- Deactivate this device; sign out and use another license; license expired / refunded / renewal-required states; discounted renewal; one year of updates per purchase
- Trial mode: all features except export
- Updater: periodic check, download, Install now / Install on next launch, keep current version, downgrade to last supported version, beta channel (needs active license), changelog
- Permissions onboarding: Screen Recording, Accessibility, Camera, Microphone, with "Open System Settings" links
- Usage analytics / diagnostics opt-out; Terms and Privacy acceptance flow

---

## G. Not in this build (confirmed against the downloaded 4.1.0-5005 update bundle; details in the spec, features 283–292. "Reactions" is a macOS feature, not a Screen Studio one.)
- **[4.x]** Loupe (glass) zoom, Clarity upscaler, camera cutout, hide camera during silence, camera looks and sharpen, reactions, edit by transcript, filler-word and pause removal, podcast audio mode, AI voiceover
- Face tracking: a face-detector binary ships, but no face-tracking setting exists in 3.7.3
- "Highlight" is a mask type only, not a click effect; click effects are circle and ripple
