"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[4838],{3905:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>k});var r=n(7294);function i(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function a(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?a(Object(n),!0).forEach((function(t){i(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):a(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function p(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var l=r.createContext({}),s=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=s(e.components);return r.createElement(l.Provider,{value:t},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,i=e.mdxType,a=e.originalType,l=e.parentName,c=p(e,["components","mdxType","originalType","parentName"]),m=s(n),u=i,k=m["".concat(l,".").concat(u)]||m[u]||d[u]||a;return n?r.createElement(k,o(o({ref:t},c),{},{components:n})):r.createElement(k,o({ref:t},c))}));function k(e,t){var n=arguments,i=t&&t.mdxType;if("string"==typeof e||i){var a=n.length,o=new Array(a);o[0]=u;var p={};for(var l in t)hasOwnProperty.call(t,l)&&(p[l]=t[l]);p.originalType=e,p[m]="string"==typeof e?e:i,o[1]=p;for(var s=2;s<a;s++)o[s]=n[s];return r.createElement.apply(null,o)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},4918:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>d,frontMatter:()=>a,metadata:()=>p,toc:()=>s});var r=n(7462),i=(n(7294),n(3905));const a={},o="crowdin string list",p={unversionedId:"commands/crowdin-string-list",id:"commands/crowdin-string-list",title:"crowdin string list",description:"Description",source:"@site/docs/commands/crowdin-string-list.md",sourceDirName:"commands",slug:"/commands/crowdin-string-list",permalink:"/crowdin-cli/commands/crowdin-string-list",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/commands/crowdin-string-list.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"crowdin string",permalink:"/crowdin-cli/commands/crowdin-string"},next:{title:"crowdin string add",permalink:"/crowdin-cli/commands/crowdin-string-add"}},l={},s=[{value:"Description",id:"description",level:2},{value:"Synopsis",id:"synopsis",level:2},{value:"Options",id:"options",level:2},{value:"Config Options",id:"config-options",level:2},{value:"See also",id:"see-also",level:2}],c={toc:s},m="wrapper";function d(e){let{components:t,...n}=e;return(0,i.kt)(m,(0,r.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"crowdin-string-list"},"crowdin string list"),(0,i.kt)("h2",{id:"description"},"Description"),(0,i.kt)("p",null,"Show a list of source strings"),(0,i.kt)("h2",{id:"synopsis"},"Synopsis"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"crowdin string list [CONFIG OPTIONS] [OPTIONS]\n")),(0,i.kt)("h2",{id:"options"},"Options"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--file"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Filter strings by file path in Crowdin"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--filter"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Filter strings by identifier, text or context"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-b"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--branch"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Specify branch name. Default: none"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--label"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Filter strings by labels (multiple labels can be specified)"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--croql"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Filter strings by CroQL expression"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--directory"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Path to the directory in Crowdin to filter strings (can\u2019t be used\ntogether with file or branch)"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--scope"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Specify field to be the target of filtering. It can be one scope or a\nlist of comma-separated scopes"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--version"),(0,i.kt)("br",{parentName:"p"}),"\n","Display version information and exit"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--help"),(0,i.kt)("br",{parentName:"p"}),"\n","Display help message and exit"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,i.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,i.kt)("br",{parentName:"p"}),"\n","Provide more information about the command execution"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,i.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-c"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--config"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Specify a path to the configuration file. Default: ",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," or\n",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin.yaml")),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--identity"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Specify a path to user-specific credentials"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--plain"),(0,i.kt)("br",{parentName:"p"}),"\n","Provide plain, processable output"),(0,i.kt)("h2",{id:"config-options"},"Config Options"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-T"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--token"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Personal access token required for authentication"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--base-url"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Base URL of Crowdin server for API requests execution"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"--base-path"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Path to your project directory on a local machine"),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"-i"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"--project-id"),"=",(0,i.kt)("em",{parentName:"p"},"\u2026"),(0,i.kt)("br",{parentName:"p"}),"\n","Numeric ID of the project"),(0,i.kt)("h2",{id:"see-also"},"See also"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("a",{parentName:"li",href:"https://developer.crowdin.com/croql/"},"Crowdin Query Language\n(CroQL)"))))}d.isMDXComponent=!0}}]);