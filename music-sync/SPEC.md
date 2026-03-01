# SyncBeat - Collaborative Music Room App

## Project Overview
- **Name**: SyncBeat
- **Type**: Web Application (Next.js + React Three Fiber)
- **Core Functionality**: Real-time collaborative music listening rooms where users can create/join rooms and listen to audio together
- **Target Users**: Friends who want to listen to music together remotely

## UI/UX Specification

### Design Philosophy
Dark, futuristic, neon-lit aesthetic with floating 3D elements, glassmorphism, and fluid animations. Think cyberpunk meets music visualization.

### Color Palette
- **Background**: `#0a0a0f` (deep space black)
- **Primary**: `#00f5ff` (electric cyan)
- **Secondary**: `#ff00aa` (hot pink)
- **Accent**: `#8b5cf6` (violet)
- **Surface**: `rgba(255, 255, 255, 0.05)` (glass)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `rgba(255, 255, 255, 0.6)`

### Typography
- **Font Family**: "Outfit" (Google Fonts) - modern, geometric
- **Headings**: 700 weight, large sizes
- **Body**: 400 weight, readable sizes

### Layout Structure

#### Landing Page (`/`)
- Full-screen 3D scene with floating geometric shapes
- Centered content with app title "SyncBeat"
- Tagline: "Listen Together, Feel Together"
- Two large animated buttons: "Join Room" and "Create Room"
- Floating music notes/particles in background

#### Join Room Page (`/join`)
- 3D entrance animation
- Centered card with glassmorphism effect
- Room code input field (6-character alphanumeric)
- "Enter Room" button
- "Go Back" link

#### Create Room Page (`/create`)
- 3D celebration animation (particles burst)
- Room info card showing:
  - Room Code (large, copyable)
  - Share Link (copyable)
- "Copy" buttons with visual feedback
- "Enter Room" button to join as host
- "Go Back" link

#### Room Page (`/room/[code]`)
- 3D audio visualizer (reacts to music)
- Central album art display with floating effect
- Audio player controls (play/pause, seek, volume)
- Current track info
- Connected users avatars (decorative)
- Room code display

### 3D Animations

#### Landing Page
- Floating icosahedrons and toruses rotating slowly
- Particle field in background
- Buttons hover: scale up + glow intensify
- Title: fade in + slight float animation

#### Page Transitions
- Camera dolly zoom effect
- Shapes morph and reposition
- Smooth opacity transitions

#### Room Page
- Audio visualizer: frequency bars or wave that reacts to audio
- Album art: floating/rotating slowly
- Ambient particles flowing around

### Components

#### GlassCard
- Background: `rgba(255, 255, 255, 0.05)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Backdrop blur: 20px
- Border radius: 24px
- Padding: 40px
- Box shadow: neon glow on hover

#### NeonButton
- Primary variant: cyan glow
- Secondary variant: pink glow
- Hover: scale(1.05), glow intensifies
- Active: scale(0.98)
- Transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

#### Input Field
- Dark background with subtle border
- Focus: cyan border glow
- Monospace font for codes

#### AudioPlayer
- Custom styled controls
- Progress bar with gradient fill
- Volume slider
- Play/pause with animated icon

## Functionality Specification

### Core Features
1. **Landing Page**: Entry point with navigation to create/join
2. **Join Room**: Enter 6-character code to join
3. **Create Room**: Generate unique room code and shareable link
4. **Music Room**: Play audio with visual feedback

### User Interactions
- Click "Create Room" → Navigate to create page with new code generated
- Click "Join Room" → Navigate to join page
- Enter code → Validate and navigate to room
- Copy code/link → Show "Copied!" feedback
- In room: Play/pause music, adjust volume, seek

### Data Handling
- Room codes: 6-character alphanumeric (generated client-side for demo)
- Share link: `/room/{code}`
- Audio: Use sample audio file for demo

### Edge Cases
- Invalid room code: Show error message
- Empty input: Disable submit button
- Copy failure: Show fallback message

## Technical Stack
- Next.js 14 (App Router)
- React Three Fiber + Drei
- Framer Motion (for UI animations)
- TypeScript
- CSS Modules or styled-jsx

## Acceptance Criteria
1. ✅ Landing page loads with 3D animated scene
2. ✅ "Join Room" navigates to join page
3. ✅ "Create Room" navigates to create page with generated code
4. ✅ Code and link can be copied with visual feedback
5. ✅ Room page displays audio player with controls
6. ✅ 3D visualizer present in room
7. ✅ Smooth page transitions
8. ✅ Responsive on mobile and desktop
9. ✅ All animations run smoothly (60fps target)
