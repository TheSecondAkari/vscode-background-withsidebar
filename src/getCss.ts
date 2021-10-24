import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import { version, BACKGROUND_VER } from './constants';

/**
 * 通过配置获取样式文本
 *
 * @param {object} options 用户配置
 * @param {boolean} useFront 是否前景图
 * @returns {string}
 */
function getStyleByOptions(options: object, useFront: boolean): string {
    const styleArr: string[] = [];
    for (const k in options) {
        // 如果useFront = false, 背景图前置，可排除掉 pointer-events
        if (!useFront && ~['pointer-events', 'z-index'].indexOf(k)) {
            continue;
        }

        // eslint-disable-next-line
        if (options.hasOwnProperty(k)) {
            styleArr.push(`${k}:${options[k]}`);
        }
    }
    return styleArr.join(';') + ';';
}

/**
 * 使用 file 协议加载图片文件并转为 base64
 * @param url 图片路径
 */
function loadImageBase64FromFileProtocol(url: string): string {
    const fileUrl = new URL(url);
    const buffer = fs.readFileSync(fileUrl);
    const extName = path.extname(fileUrl.pathname).substr(1);

    return `data:image/${extName};base64,${buffer.toString('base64')}`;
}

/**
 * 生成 css 内容
 *
 * @export
 * @param {string[]} images 图片数组
 * @param {*} [style={}] 自定义样式
 * @param {Array<any>} [styles=[]] 每个背景图的自定义样式
 * @param {boolean} [useFront=true] 是否用前景图
 * @param {boolean} [loop=false] 是否循环使用图片
 * @returns {string}
 */
export default function (
    images: string[],
    style: any = {},
    styles: Array<any> = [],
    useFront = true,
    loop = false
): string {
    // ------ 默认样式 ------
    const defStyle = getStyleByOptions(style, useFront);

    // ------ 在前景图时使用 ::after ------
    const frontContent = useFront ? '::after' : '::before';

    /*
      图片预处理
      在 v1.51.1 版本之后, vscode 将工作区放入 sandbox 中运行并添加了 file 协议的访问限制, 导致使用 file 协议的背景图片无法显示
      当检测到配置文件使用 file 协议时, 需要将图片读取并转为 base64, 而后再插入到 css 中
    */

    const list = images.map(url => {
        return url.startsWith('file://') ? loadImageBase64FromFileProtocol(url) : url;
    });

    // ------ 组合样式 ------
    const imageStyleContent = list
        .map((img, index) => {
            // ------ nth-child ------
            // nth-child(1)
            let nthChildIndex = index + 1 + '';
            // nth-child(3n + 1)
            if (loop) {
                nthChildIndex = `${images.length}n + ${nthChildIndex}`;
            }

            // ------ style ------
            const styleContent = defStyle + getStyleByOptions(styles[index] || {}, useFront);

            return (
                // code editor
                `[id="workbench.parts.editor"] .split-view-view:nth-child(${nthChildIndex}) ` +
                `.editor-container .editor-instance>.monaco-editor ` +
                `.overflow-guard>.monaco-scrollable-element${frontContent}{background-image: url('${img}');${styleContent}}` +
                '\n' +
                // home screen
                `[id="workbench.parts.editor"] .split-view-view:nth-child(${nthChildIndex}) ` +
                `.empty::before { background-image: url('${img}');${styleContent} }`
            );
        })
        .join('\n');

    const content = `
/*css-background-start*/
/*${BACKGROUND_VER}.${version}*/
${imageStyleContent}
[id="workbench.parts.editor"] .split-view-view .editor-container .editor-instance>.monaco-editor .overflow-guard>.monaco-scrollable-element>.monaco-editor-background{background: none;}
/*css-background-end*/
`;

    return content;
}

/**
 * 生成 侧边栏 css 内容
 *
 * @export
 * @param {string[]} images 图片数组
 * @param {*} [style={}] 自定义样式
 * @param {Array<any>} [styles=[]] 每个背景图的自定义样式
 * @param {boolean} [useFront=true] 是否用前景图
 * @param {boolean} [loop=false] 是否循环使用图片
 * @param {string} content 已生成的代码页背景css片段
 * @param {string[]} sidebarItems 侧边栏需要生效的items
 * @returns {string}
 */
export const addSidebarImagesCss = function (
    images: string[],
    style: any = {},
    styles: Array<any> = [],
    useFront = true,
    loop = false,
    content: string,
    sidebarItems: string[]
): string {
    // ------ 默认样式 ------
    // 默认都使用 useFront为false  ::before
    const defStyle = getStyleByOptions(style, useFront);

    // ------ 在前景图时使用 ::after ------
    // const frontContent = useFront ? '::after' : '::before';

    /*
      图片预处理
      在 v1.51.1 版本之后, vscode 将工作区放入 sandbox 中运行并添加了 file 协议的访问限制, 导致使用 file 协议的背景图片无法显示
      当检测到配置文件使用 file 协议时, 需要将图片读取并转为 base64, 而后再插入到 css 中
    */
    const list = images.map(url => {
        return url.startsWith('file://') ? loadImageBase64FromFileProtocol(url) : url;
    });

    // ------ 组合样式 ------
    const imageStyleContent = list
        .map((img, index) => {
            // ------ nth-child ------
            // nth-child(1)
            let nthChildIndex = index + 1 + '';
            // nth-child(3n + 1)
            if (loop) {
                nthChildIndex = `${images.length}n + ${nthChildIndex}`;
            }

            // ------ style ------
            const styleContent = defStyle + getStyleByOptions(styles[index] || {}, useFront);
            const Items = sidebarItems && sidebarItems.length ? sidebarItems : ['workbench.view.explorer'];
            // sidebar content css
            return (
                Items.map(
                    id =>
                        `[id="${id}"] .split-view-view:nth-child(${nthChildIndex}) ` +
                        `.pane-body .monaco-list>.monaco-scrollable-element::before{background-image: url('${img}');${styleContent}}`
                ).join('\n') + '\n'
            );
        })
        .join('\n');
    return content.replace('/*css-background-end*/', '') + imageStyleContent + '/*css-background-end*/';
};
