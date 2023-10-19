"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[1965],{3905:(e,n,t)=>{t.d(n,{Zo:()=>s,kt:()=>k});var r=t(7294);function o(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function i(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function a(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?i(Object(t),!0).forEach((function(n){o(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):i(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,o=function(e,n){if(null==e)return{};var t,r,o={},i=Object.keys(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||(o[t]=e[t]);return o}(e,n);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)t=i[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(o[t]=e[t])}return o}var l=r.createContext({}),c=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):a(a({},n),e)),t},s=function(e){var n=c(e.components);return r.createElement(l.Provider,{value:n},e.children)},d="mdxType",m={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,o=e.mdxType,i=e.originalType,l=e.parentName,s=p(e,["components","mdxType","originalType","parentName"]),d=c(t),u=o,k=d["".concat(l,".").concat(u)]||d[u]||m[u]||i;return t?r.createElement(k,a(a({ref:n},s),{},{components:t})):r.createElement(k,a({ref:n},s))}));function k(e,n){var t=arguments,o=n&&n.mdxType;if("string"==typeof e||o){var i=t.length,a=new Array(i);a[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p[d]="string"==typeof e?e:o,a[1]=p;for(var c=2;c<i;c++)a[c]=t[c];return r.createElement.apply(null,a)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},1914:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>a,default:()=>m,frontMatter:()=>i,metadata:()=>p,toc:()=>c});var r=t(7462),o=(t(7294),t(3905));const i={},a="crowdin screenshot delete",p={unversionedId:"commands/crowdin-screenshot-delete",id:"commands/crowdin-screenshot-delete",title:"crowdin screenshot delete",description:"Description",source:"@site/docs/commands/crowdin-screenshot-delete.md",sourceDirName:"commands",slug:"/commands/crowdin-screenshot-delete",permalink:"/crowdin-cli/commands/crowdin-screenshot-delete",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/commands/crowdin-screenshot-delete.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin screenshot list",permalink:"/crowdin-cli/commands/crowdin-screenshot-list"},next:{title:"crowdin label",permalink:"/crowdin-cli/commands/crowdin-label"}},l={},c=[{value:"Description",id:"description",level:2},{value:"Synopsis",id:"synopsis",level:2},{value:"Arguments",id:"arguments",level:2},{value:"Options",id:"options",level:2},{value:"Config Options",id:"config-options",level:2}],s={toc:c},d="wrapper";function m(e){let{components:n,...t}=e;return(0,o.kt)(d,(0,r.Z)({},s,t,{components:n,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"crowdin-screenshot-delete"},"crowdin screenshot delete"),(0,o.kt)("h2",{id:"description"},"Description"),(0,o.kt)("p",null,"Delete screenshot"),(0,o.kt)("h2",{id:"synopsis"},"Synopsis"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre"},"crowdin screenshot delete <name> [CONFIG OPTIONS] [OPTIONS]\n")),(0,o.kt)("h2",{id:"arguments"},"Arguments"),(0,o.kt)("p",null,(0,o.kt)("em",{parentName:"p"},"<","name",">"),(0,o.kt)("br",{parentName:"p"}),"\n","Screenshot name"),(0,o.kt)("h2",{id:"options"},"Options"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-c"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--config"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,o.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,o.kt)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--help"),(0,o.kt)("br",{parentName:"p"}),"\n","Display help message and exit"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--identity"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,o.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,o.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,o.kt)("br",{parentName:"p"}),"\n","Provide more information about the command execution"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--version"),(0,o.kt)("br",{parentName:"p"}),"\n","Display version information and exit"),(0,o.kt)("h2",{id:"config-options"},"Config Options"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-i"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Numeric ID of the project"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-T"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--token"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Personal access token required for authentication"))}m.isMDXComponent=!0}}]);