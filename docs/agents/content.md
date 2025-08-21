Search the public web for websites that explicitly provide iframe or embed code for reusable widgets, scripts, or apps that can be embedded into other websites. 
Prioritize results that:
- Include the actual <iframe> or <script> embed code in their documentation or public page.
- Offer free or publicly accessible embedding without authentication.
- Provide interactive or data-rich content useful for an engineering dashboard, such as:
  * Maps, charts, diagrams, status boards
  * Real-time data feeds (weather, traffic, finance, IoT)
  * Monitoring dashboards or visualizations
  * Code playgrounds, sandboxes, or demos
  * Multimedia players (video, audio, 3D models)
  * Forms, calendars, calculators
- Support modern web technologies (webcomponents, shadow DOM, virtual DOM) or lightweight scripts.
- Allow embedding via <iframe> from external domains (no X-Frame-Options: DENY/SAMEORIGIN).

Return results in a structured JSON array with the following fields:
[
  {
    "name": "Provider name",
    "url": "Direct link to the page with embed code",
    "embedType": "iframe | script | webcomponent",
    "category": "map | chart | video | form | etc.",
    "exampleEmbed": "Full example of the working embed code",
    "notes": "Any licensing, attribution, or integration requirements"
  }
]
Focus on high-quality, actively maintained sources. Include at least 30 entries if possible.
Search seed keywords: 
site:*.com "embed code" OR "iframe embed" free widget maps video audio chart form game generator webcomponent embed virtual DOM iframe embeddable widget script reusable custom element shadow DOM
