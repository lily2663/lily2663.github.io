import { api } from '../core/api.js';
import { esc, toast } from '../core/dom.js';
export function renderModuleInstaller(root, onInstalled) {
  const $ = (selector) => root.querySelector(selector);
  const starterManifest = `apiVersion: lily-module/v1\nid: my-card\nname: My Card\nversion: 1.0.0\ncategory: personal\ndescription: 我的第一个模块\ncontext: any\nallowedSlots:\n  - home.sidebar\ntemplate:\n  partial: lily/modules/my-card/render.html\ndefaults:\n  title: Hello\nschema:\n  title:\n    type: string\n    label: 标题`;
  const starterTemplate = `<section class="my-card"><h3>{{ .Config.title }}</h3></section>`;
  root.innerHTML = `<details class="section installer"><summary>安装可信本地模块包 <span>开发者工具</span></summary><p class="muted">模块模板和脚本会在构建/浏览器中执行；仅安装你审阅过的本地代码。模块模板路径固定为 lily/modules/&lt;id&gt;/render.html。</p><label class="field"><span>manifest.yaml</span><textarea id="module-manifest">${esc(starterManifest)}</textarea></label><label class="field"><span>render.html</span><textarea id="module-template">${esc(starterTemplate)}</textarea></label><label class="field"><span>可选 CSS（manifest assets.styles 声明后填写）</span><textarea id="module-style"></textarea></label><label class="field"><span>可选 JS（manifest assets.scripts 声明后填写）</span><textarea id="module-script"></textarea></label><p><button class="btn primary" id="module-install">安装本地模块</button></p></details>`;
  $("#module-install").onclick = async () => {
    try {
      await api("/api/modules/install", { method: "POST", body: JSON.stringify({ manifest: $("#module-manifest").value, template: $("#module-template").value, style: $("#module-style").value, script: $("#module-script").value }) });
      toast("模块已安装；现在可在布局页添加。"); onInstalled();
    } catch (error) { toast(error.message); }
  };
}
