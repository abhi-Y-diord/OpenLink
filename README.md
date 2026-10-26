# OpenLink

### Share code. Open anywhere. No hassle.

**OpenLink** is a lightweight code-sharing platform that lets you organize multiple coding experiments into a single shareable link. Create a batch, share it with classmates, and access the code from any device.

<p align="center">
  <a href="https://openlink.openlink.workers.dev">
    <img src="https://img.shields.io/badge/🌐_Visit_OpenLink-Live_Demo-0d9488?style=for-the-badge" alt="Visit OpenLink">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers">
  <img src="https://img.shields.io/badge/Storage-KV-blueviolet?style=flat-square" alt="Cloudflare KV">
</p>

---

## ✨ Features

- **Batch Code Sharing** — Organize multiple experiments under one shareable link.
- **Simple Sharing** — Automatically generated, easy-to-share link names.
- **Cross-Device Access** — Open shared code on your computer, phone, or another device.
- **Copy Code** — Quickly copy code for studying, editing, or running.
- **Automatic Expiry** — Choose a retention period of 5, 10, or 20 days.
- **Light & Dark Themes** — Switch between black and white appearances.
- **Responsive Design** — A clean interface designed for desktop and mobile screens.
- **Lightweight & Fast** — Built with vanilla HTML, CSS, and JavaScript.

## 🚀 Live Demo

**Try it now:** [OpenLink — Live Website](https://openlink.openlink.workers.dev)

Create a batch of code experiments, save it, and share the generated link with anyone who needs access.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Client-side functionality |
| Cloudflare Workers | Server-side API and request handling |
| Cloudflare KV | Persistent storage for shared batches |

## 📂 Project Structure

```text
OpenLink/
├── index.html       # Main interface
├── style.css        # Styling and responsive layout
├── app.js           # Frontend application logic
├── storage.js       # Storage and API integration
├── worker.js        # Cloudflare Worker API
├── wrangler.toml    # Cloudflare deployment configuration
├── .assetsignore    # Excludes deployment-only files
└── README.md        # Project documentation
```

## ⚙️ How It Works

1. Create a batch of coding experiments.
2. Add the code you want to share.
3. Select an expiry period.
4. Save the batch and receive a unique link.
5. Share the link so others can view and copy the code.
6. The batch becomes unavailable after its configured expiry.

## ☁️ Deployment

OpenLink uses Cloudflare Workers to serve the application and handle API requests, with Cloudflare KV for storing shared batches.

The project includes a `wrangler.toml` configuration file for the Cloudflare deployment setup.

> **Note:** Deployment requires your own Cloudflare account and a correctly configured KV namespace.

## 🎯 Who Is It For?

- Students sharing practical and laboratory experiments.
- Developers exchanging small code snippets.
- College teams collaborating on programming assignments.
- Anyone who needs a simple way to share code across devices.

## 🔒 Data & Expiry

Shared batches are stored using Cloudflare KV and have a configurable expiry period. Avoid sharing passwords, API keys, personal information, or other sensitive data.

## 💡 Why OpenLink?

Code sharing should be simple. OpenLink focuses on a straightforward workflow: organize your code, generate a link, and access it wherever you need it.

---

<p align="center">
  <b>Built for simpler code sharing.</b><br>
  <a href="https://openlink.openlink.workers.dev">Open OpenLink →</a>
</p>
