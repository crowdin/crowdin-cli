"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[6685],{3905:(e,t,n)=>{n.d(t,{Zo:()=>s,kt:()=>k});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function p(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=r.createContext({}),c=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},s=function(e){var t=c(e.components);return r.createElement(l.Provider,{value:t},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,i=e.originalType,l=e.parentName,s=p(e,["components","mdxType","originalType","parentName"]),m=c(n),u=a,k=m["".concat(l,".").concat(u)]||m[u]||d[u]||i;return n?r.createElement(k,o(o({ref:t},s),{},{components:n})):r.createElement(k,o({ref:t},s))}));function k(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=n.length,o=new Array(i);o[0]=u;var p={};for(var l in t)hasOwnProperty.call(t,l)&&(p[l]=t[l]);p.originalType=e,p[m]="string"==typeof e?e:a,o[1]=p;for(var c=2;c<i;c++)o[c]=n[c];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},3875:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>d,frontMatter:()=>i,metadata:()=>p,toc:()=>c});var r=n(7462),a=(n(7294),n(3905));const i={},o="crowdin list translations",p={unversionedId:"commands/crowdin-list-translations",id:"commands/crowdin-list-translations",title:"crowdin list translations",description:"Description",source:"@site/docs/commands/crowdin-list-translations.md",sourceDirName:"commands",slug:"/commands/crowdin-list-translations",permalink:"/crowdin-cli/commands/crowdin-list-translations",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/cli3/website/docs/commands/crowdin-list-translations.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin list sources",permalink:"/crowdin-cli/commands/crowdin-list-sources"},next:{title:"crowdin list project",permalink:"/crowdin-cli/commands/crowdin-list-project"}},l={},c=[],s={toc:c},m="wrapper";function d(e){let{components:t,...n}=e;return(0,a.kt)(m,(0,r.Z)({},s,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"crowdin-list-translations"},"crowdin list translations"),(0,a.kt)("h1",{id:"description"},"Description"),(0,a.kt)("p",null,"List information about the translation files that match the wild-card\npattern contained in the current project"),(0,a.kt)("h1",{id:"synopsis"},"Synopsis"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"crowdin list translations [CONFIG OPTIONS] [OPTIONS]\n")),(0,a.kt)("h1",{id:"options"},"Options"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-c"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--config"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--help"),(0,a.kt)("br",{parentName:"p"}),"\n","Show this help message and exit"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--identity"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--plain"),(0,a.kt)("br",{parentName:"p"}),"\n","Provide plain, processable output"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--tree"),(0,a.kt)("br",{parentName:"p"}),"\n","List contents of directories in a tree-like format"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,a.kt)("br",{parentName:"p"}),"\n","Provide more information on the command execution"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--version"),(0,a.kt)("br",{parentName:"p"}),"\n","Print version information and exit"),(0,a.kt)("h1",{id:"config-options"},"Config Options"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--dest"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Specify file name in Crowdin"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-i"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Numerical ID of the project"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-s"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--source"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Path to the source files"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-t"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--translation"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Path to the translation files"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-T"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--token"),"=",(0,a.kt)("em",{parentName:"p"},"\u2026"),(0,a.kt)("br",{parentName:"p"}),"\n","Personal access token required for authentication"))}d.isMDXComponent=!0}}]);