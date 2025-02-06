"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[3817],{5680:(e,n,t)=>{t.d(n,{xA:()=>m,yg:()=>y});var r=t(6540);function i(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function a(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?a(Object(t),!0).forEach((function(n){i(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,i=function(e,n){if(null==e)return{};var t,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||(i[t]=e[t]);return i}(e,n);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var l=r.createContext({}),d=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},m=function(e){var n=d(e.components);return r.createElement(l.Provider,{value:n},e.children)},s="mdxType",c={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,i=e.mdxType,a=e.originalType,l=e.parentName,m=p(e,["components","mdxType","originalType","parentName"]),s=d(t),u=i,y=s["".concat(l,".").concat(u)]||s[u]||c[u]||a;return t?r.createElement(y,o(o({ref:n},m),{},{components:t})):r.createElement(y,o({ref:n},m))}));function y(e,n){var t=arguments,i=n&&n.mdxType;if("string"==typeof e||i){var a=t.length,o=new Array(a);o[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p[s]="string"==typeof e?e:i,o[1]=p;for(var d=2;d<a;d++)o[d]=t[d];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},2304:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>c,frontMatter:()=>a,metadata:()=>p,toc:()=>d});var r=t(8168),i=(t(6540),t(5680));const a={},o="crowdin distribution add",p={unversionedId:"commands/crowdin-distribution-add",id:"commands/crowdin-distribution-add",title:"crowdin distribution add",description:"Description",source:"@site/docs/commands/crowdin-distribution-add.md",sourceDirName:"commands",slug:"/commands/crowdin-distribution-add",permalink:"/crowdin-cli/commands/crowdin-distribution-add",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/commands/crowdin-distribution-add.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin distribution list",permalink:"/crowdin-cli/commands/crowdin-distribution-list"},next:{title:"crowdin distribution release",permalink:"/crowdin-cli/commands/crowdin-distribution-release"}},l={},d=[{value:"Description",id:"description",level:2},{value:"Synopsis",id:"synopsis",level:2},{value:"Arguments",id:"arguments",level:2},{value:"Options",id:"options",level:2},{value:"Config Options",id:"config-options",level:2},{value:"Examples",id:"examples",level:2}],m={toc:d},s="wrapper";function c(e){let{components:n,...t}=e;return(0,i.yg)(s,(0,r.A)({},m,t,{components:n,mdxType:"MDXLayout"}),(0,i.yg)("h1",{id:"crowdin-distribution-add"},"crowdin distribution add"),(0,i.yg)("h2",{id:"description"},"Description"),(0,i.yg)("p",null,"Add a new distribution"),(0,i.yg)("h2",{id:"synopsis"},"Synopsis"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre"},"crowdin distribution add <name> [CONFIG OPTIONS] [OPTIONS]\n")),(0,i.yg)("h2",{id:"arguments"},"Arguments"),(0,i.yg)("p",null,(0,i.yg)("em",{parentName:"p"},"<","name",">"),(0,i.yg)("br",{parentName:"p"}),"\n","Distribution name"),(0,i.yg)("h2",{id:"options"},"Options"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--export-mode"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Distribution export mode. Supported modes: default, bundle"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--file"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Path to the file in the Crowdin project. Can be specified multiple times"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--bundle-id"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Bundle ID. Can be specified multiple times. Requires 'export-mode' to be\nset to 'bundle'"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-b"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--branch"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Specify branch name. Default: none"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-V"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--version"),(0,i.yg)("br",{parentName:"p"}),"\n","Display version information and exit"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-h"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--help"),(0,i.yg)("br",{parentName:"p"}),"\n","Display help message and exit"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--no-progress"),(0,i.yg)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-v"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--verbose"),(0,i.yg)("br",{parentName:"p"}),"\n","Provide more information about the command execution"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--no-colors"),(0,i.yg)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-c"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--config"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,i.yg)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,i.yg)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--identity"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--plain"),(0,i.yg)("br",{parentName:"p"}),"\n","Provide plain, processable output"),(0,i.yg)("h2",{id:"config-options"},"Config Options"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-T"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--token"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Personal access token required for authentication"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,i.yg)("p",null,(0,i.yg)("inlineCode",{parentName:"p"},"-i"),", ",(0,i.yg)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,i.yg)("em",{parentName:"p"},"\u2026"),(0,i.yg)("br",{parentName:"p"}),"\n","Numeric ID of the project"),(0,i.yg)("h2",{id:"examples"},"Examples"),(0,i.yg)("p",null,"Add a new distribution with the ",(0,i.yg)("inlineCode",{parentName:"p"},"default")," export mode and the\n",(0,i.yg)("inlineCode",{parentName:"p"},"src/values/strings.xml")," file:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre"},'crowdin distribution add "Android" --export-mode default --file src/values/strings.xml\n')),(0,i.yg)("p",null,"Add a new distribution with the ",(0,i.yg)("inlineCode",{parentName:"p"},"default")," export mode and the\n",(0,i.yg)("inlineCode",{parentName:"p"},"src/values/strings.xml")," file on the ",(0,i.yg)("inlineCode",{parentName:"p"},"main")," branch:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre"},'crowdin distribution add "Android" --export-mode default --branch main --file src/values/strings.xml\n')),(0,i.yg)("p",null,"Add a new distribution with the ",(0,i.yg)("inlineCode",{parentName:"p"},"bundle")," export mode:"),(0,i.yg)("pre",null,(0,i.yg)("code",{parentName:"pre"},'crowdin distribution add "iOS Bundle" --export-mode bundle --bundle-id 19\n')),(0,i.yg)("p",null,"See the ",(0,i.yg)("a",{parentName:"p",href:"/crowdin-cli/commands/crowdin-bundle-list"},(0,i.yg)("inlineCode",{parentName:"a"},"crowdin bundle list"),"\ncommand")," to get the list of\nbundles including their IDs."))}c.isMDXComponent=!0}}]);