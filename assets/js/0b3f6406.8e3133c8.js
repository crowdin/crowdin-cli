"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[6533],{3905:(e,n,t)=>{t.d(n,{Zo:()=>d,kt:()=>k});var r=t(7294);function o(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function a(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function i(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?a(Object(t),!0).forEach((function(n){o(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):a(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,o=function(e,n){if(null==e)return{};var t,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||(o[t]=e[t]);return o}(e,n);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)t=a[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(o[t]=e[t])}return o}var l=r.createContext({}),c=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):i(i({},n),e)),t},d=function(e){var n=c(e.components);return r.createElement(l.Provider,{value:n},e.children)},m="mdxType",s={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,o=e.mdxType,a=e.originalType,l=e.parentName,d=p(e,["components","mdxType","originalType","parentName"]),m=c(t),u=o,k=m["".concat(l,".").concat(u)]||m[u]||s[u]||a;return t?r.createElement(k,i(i({ref:n},d),{},{components:t})):r.createElement(k,i({ref:n},d))}));function k(e,n){var t=arguments,o=n&&n.mdxType;if("string"==typeof e||o){var a=t.length,i=new Array(a);i[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p[m]="string"==typeof e?e:o,i[1]=p;for(var c=2;c<a;c++)i[c]=t[c];return r.createElement.apply(null,i)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},448:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>i,default:()=>s,frontMatter:()=>a,metadata:()=>p,toc:()=>c});var r=t(7462),o=(t(7294),t(3905));const a={},i="crowdin download sources",p={unversionedId:"commands/crowdin-download-sources",id:"commands/crowdin-download-sources",title:"crowdin download sources",description:"Description",source:"@site/docs/commands/crowdin-download-sources.md",sourceDirName:"commands",slug:"/commands/crowdin-download-sources",permalink:"/crowdin-cli/commands/crowdin-download-sources",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/cli3/website/docs/commands/crowdin-download-sources.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin download",permalink:"/crowdin-cli/commands/crowdin-download"},next:{title:"crowdin download targets",permalink:"/crowdin-cli/commands/crowdin-download-targets"}},l={},c=[],d={toc:c},m="wrapper";function s(e){let{components:n,...t}=e;return(0,o.kt)(m,(0,r.Z)({},d,t,{components:n,mdxType:"MDXLayout"}),(0,o.kt)("h1",{id:"crowdin-download-sources"},"crowdin download sources"),(0,o.kt)("h1",{id:"description"},"Description"),(0,o.kt)("p",null,"Download sources from Crowdin to the specified place"),(0,o.kt)("h1",{id:"synopsis"},"Synopsis"),(0,o.kt)("pre",null,(0,o.kt)("code",{parentName:"pre"},"crowdin (download|pull) sources [CONFIG OPTIONS] [OPTIONS]\n")),(0,o.kt)("h1",{id:"options"},"Options"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--version"),(0,o.kt)("br",{parentName:"p"}),"\n","Print version information and exit"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--help"),(0,o.kt)("br",{parentName:"p"}),"\n","Show this help message and exit"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,o.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,o.kt)("br",{parentName:"p"}),"\n","Provide more information on the command execution"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,o.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-c"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--config"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,o.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,o.kt)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--identity"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--plain"),(0,o.kt)("br",{parentName:"p"}),"\n","Provide plain, processable output"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-b"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--branch"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify branch name. Default: none"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--reviewed"),(0,o.kt)("br",{parentName:"p"}),"\n","Download only reviewed sources"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--dryrun"),(0,o.kt)("br",{parentName:"p"}),"\n","Print a command output without execution"),(0,o.kt)("h1",{id:"config-options"},"Config Options"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-T"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--token"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Personal access token required for authentication"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-i"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Numerical ID of the project"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-s"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--source"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Path to the source files"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"-t"),", ",(0,o.kt)("inlineCode",{parentName:"p"},"--translation"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Path to the translation files"),(0,o.kt)("p",null,(0,o.kt)("inlineCode",{parentName:"p"},"--dest"),"=",(0,o.kt)("em",{parentName:"p"},"\u2026"),(0,o.kt)("br",{parentName:"p"}),"\n","Specify file name in Crowdin"))}s.isMDXComponent=!0}}]);