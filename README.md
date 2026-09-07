<img width="512" height="455" alt="1000034076" src="https://github.com/user-attachments/assets/5193c0e8-36c0-4699-a75f-0b71f5df5c1e" />


# Pulse — GitHub Release Analytics

Pulse is a modern, lightweight Progressive Web App (PWA) designed to track, analyze, and visualize release download metrics for public GitHub repositories. Built with zero external frameworks, Pulse delivers a fast, privacy-focused dashboard to monitor asset adoption and release performance in real time.

<img width="1220" height="2219" alt="1000034101" src="https://github.com/user-attachments/assets/3622d02f-f077-4bd1-885f-b2b32916788d" />



## Key Features

* **Download Breakdown**: Real-time aggregated download counts across all release assets (`.exe`, `.apk`, `.zip`, etc.).
* **Repository Health**: Instant visibility into total stars, forks, latest published tag, and release cadence.
* **Progressive Web App**: Fully installable on Windows, macOS, Android, and iOS with offline shell support via Service Workers.
* **Local-First Storage**: Persistent search history and favorited repositories saved locally in `localStorage` without login requirements.
* **Adaptive Theme**: Built-in dark and light modes with seamless automatic saving of user preferences.
* **Fully Responsive**: Optimized UI layouts tailored for mobile viewports (`viewport-fit=cover`) and desktop displays.



## Tech Stack

* **Frontend**: Vanilla JavaScript (ES6+), Modern HTML5, CSS3 (CSS Variables, Grid, Flexbox)
* **API**: GitHub REST API v3
* **PWA**: Web App Manifest, Service Worker Caching (`sw.js`).

<img width="1220" height="2161" alt="1000034102" src="https://github.com/user-attachments/assets/a7aaec9f-54dd-48e5-b1aa-4879927a352c" />


## Getting Started

Since Pulse runs entirely in the browser using public APIs, no build tools or server setup are required.

1. Clone the repository:
   ```bash
   git clone [https://github.com/drJhonatan00/pulse.git](https://github.com/drJhonatan00/pulse.git)

2. Open index.html in any web browser or serve via a local development server.
