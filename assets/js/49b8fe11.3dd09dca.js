"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[1932],{3905:(e,n,t)=>{t.d(n,{Zo:()=>d,kt:()=>k});var r=t(7294);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var l=r.createContext({}),c=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},d=function(e){var n=c(e.components);return r.createElement(l.Provider,{value:n},e.children)},m="mdxType",s={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,i=e.originalType,l=e.parentName,d=p(e,["components","mdxType","originalType","parentName"]),m=c(t),u=a,k=m["".concat(l,".").concat(u)]||m[u]||s[u]||i;return t?r.createElement(k,o(o({ref:n},d),{},{components:t})):r.createElement(k,o({ref:n},d))}));function k(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var i=t.length,o=new Array(i);o[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p[m]="string"==typeof e?e:a,o[1]=p;for(var c=2;c<i;c++)o[c]=t[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},2356:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>s,frontMatter:()=>i,metadata:()=>p,toc:()=>c});var r=t(7462),a=(t(7294),t(3905));const i={},o="crowdin label add",p={unversionedId:"commands/crowdin-label-add",id:"commands/crowdin-label-add",title:"crowdin label add",description:"Description",source:"@site/docs/commands/crowdin-label-add.md",sourceDirName:"commands",slug:"/commands/crowdin-label-add",permalink:"/crowdin-cli/commands/crowdin-label-add",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/commands/crowdin-label-add.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin label list",permalink:"/crowdin-cli/commands/crowdin-label-list"},next:{title:"crowdin label delete",permalink:"/crowdin-cli/commands/crowdin-label-delete"}},l={},c=[{value:"Description",id:"description",level:2},{value:"Synopsis",id:"synopsis",level:2},{value:"Arguments",id:"arguments",level:2},{value:"Options",id:"options",level:2},{value:"Config Options",id:"config-options",level:2}],d={toc:c},m="wrapper";function s(e){let{components:n,...t}=e;return(0,a.kt)(m,(0,r.Z)({},d,t,{components:n,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"crowdin-label-add"},"crowdin label add"),(0,a.kt)("h2",{id:"description"},"Description"),(0,a.kt)("p",null,"Add a new label"),(0,a.kt)("h2",{id:"synopsis"},"Synopsis"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"crowdin label add <title> [CONFIG OPTIONS] [OPTIONS]\n")),(0,a.kt)("h2",{id:"arguments"},"Arguments"),(0,a.kt)("p",null,(0,a.kt)("em",{parentName:"p"},"<","title",">"),(0,a.kt)("br",{parentName:"p"}),"\n","Label title"),(0,a.kt)("h2",{id:"options"},"Options"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--version"),(0,a.kt)("br",{parentName:"p"}),"\n","Display version information and exit"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--help"),(0,a.kt)("br",{parentName:"p"}),"\n","Display help message and exit"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,a.kt)("br",{parentName:"p"}),"\n","Provide more information about the command execution"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-c"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--config"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--identity"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--plain"),(0,a.kt)("br",{parentName:"p"}),"\n","Provide plain, processable output"),(0,a.kt)("h2",{id:"config-options"},"Config Options"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-T"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--token"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Personal access token required for authentication"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-i"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Numeric ID of the project"))}s.isMDXComponent=!0}}]);