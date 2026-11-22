# liltaya.github.io

Source for my portfolio: **[liltaya.github.io](https://liltaya.github.io)**

Each project has a 3D model drawn in code with three.js, and the pages turn in 3D as you move between them. The models are stylised; every project page also shows real screenshots and real test results, captured on 13 November 2026 by building and running the projects themselves.

```text
index.html                      all pages and their content
assets/css/site.css             layout, colour and type
src/models.js                   the five project models and their turntable
src/main.js                     routing, 3D page transitions and the WebGL scene
assets/js/site.js               the bundle built from src/ (three.js included)
assets/img/                     screenshots of the running projects
assets/video/stair-robot.mp4    the ENSC 100 stair-climbing robot
assets/fonts/                   Big Shoulders and Instrument Sans (SIL Open Font License)
og-card.png                     link preview image
Taisiia_Mamenko_Resume.pdf      current resume
```

## Working on it

```bash
npm install
npm run build              # rebuilds assets/js/site.js from src/
python3 -m http.server     # then open http://localhost:8000
```

Without JavaScript or WebGL the site falls back to a plain page with the same content. With "reduce motion" switched on, pages fade instead of turning and the models hold still.

Taisiia (Taya) Mamenko, Engineering Science, Simon Fraser University
