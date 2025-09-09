# ✨ AI Magic Marker idea
4. The app calls the Azure Chat Completions API and replaces the selected text with the AI’s rewritten version.


---


## ⚙️ Configuration


All configuration is handled via **Vite environment variables**. Create a `.env.local` file in the project root:


```bash
VITE_AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE-NAME.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=YOUR-SECRET-KEY
VITE_AZURE_OPENAI_DEPLOYMENT=YOUR-DEPLOYMENT-NAME
VITE_AZURE_OPENAI_API_VERSION=2024-08-01-preview
```


- **VITE_AZURE_OPENAI_ENDPOINT** → Your Azure OpenAI resource endpoint.
- **VITE_AZURE_OPENAI_API_KEY** → Your Azure API key.
- **VITE_AZURE_OPENAI_DEPLOYMENT** → The **deployment name** you created (e.g., `gpt-4o-mini`).
- **VITE_AZURE_OPENAI_API_VERSION** → API version (defaults to `2024-08-01-preview`).


> ⚠️ **Security note**: Because this calls Azure directly from the browser, the API key is visible in DevTools. For production, proxy via a backend.


---


## 🛠 Installation & Usage


### 1. Clone & Install
```bash
git clone https://github.com/your-username/tiptap-azure-ai.git
cd tiptap-azure-ai
npm install
```


### 2. Configure Env
Create `.env.local` and add your Azure credentials (see [Configuration](#️-configuration)).


### 3. Run in Dev
```bash
npm run dev
```
Visit: [http://localhost:5173](http://localhost:5173)


### 4. Build for Production
```bash
npm run build
npm run preview
```


---


## ✨ Features
- 🎨 Gradient + glassmorphism UI
- 📝 Rich-text editing with **Tiptap**
- 🔍 Selection preview
- 💬 Chat panel for instructions
- 🤖 Live Azure AI rewriting
- 📱 Responsive design (mobile/desktop)


---


## 📚 Tech Stack
- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Tiptap](https://tiptap.dev/)
- [Azure AI Foundry](https://learn.microsoft.com/en-us/azure/ai-services/openai/)


---


## 📝 License
MIT – feel free to adapt and extend!