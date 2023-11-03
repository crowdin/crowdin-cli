"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[6116],{3905:(e,n,t)=>{t.d(n,{Zo:()=>c,kt:()=>k});var r=t(7294);function a(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);n&&(r=r.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,r)}return t}function i(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){a(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function p(e,n){if(null==e)return{};var t,r,a=function(e,n){if(null==e)return{};var t,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)t=o[r],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)t=o[r],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var l=r.createContext({}),s=function(e){var n=r.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):i(i({},n),e)),t},c=function(e){var n=s(e.components);return r.createElement(l.Provider,{value:n},e.children)},m="mdxType",d={inlineCode:"code",wrapper:function(e){var n=e.children;return r.createElement(r.Fragment,{},n)}},u=r.forwardRef((function(e,n){var t=e.components,a=e.mdxType,o=e.originalType,l=e.parentName,c=p(e,["components","mdxType","originalType","parentName"]),m=s(t),u=a,k=m["".concat(l,".").concat(u)]||m[u]||d[u]||o;return t?r.createElement(k,i(i({ref:n},c),{},{components:t})):r.createElement(k,i({ref:n},c))}));function k(e,n){var t=arguments,a=n&&n.mdxType;if("string"==typeof e||a){var o=t.length,i=new Array(o);i[0]=u;var p={};for(var l in n)hasOwnProperty.call(n,l)&&(p[l]=n[l]);p.originalType=e,p[m]="string"==typeof e?e:a,i[1]=p;for(var s=2;s<o;s++)i[s]=t[s];return r.createElement.apply(null,i)}return r.createElement.apply(null,t)}u.displayName="MDXCreateElement"},2753:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>i,default:()=>d,frontMatter:()=>o,metadata:()=>p,toc:()=>s});var r=t(7462),a=(t(7294),t(3905));const o={},i="crowdin",p={unversionedId:"commands/crowdin",id:"commands/crowdin",title:"crowdin",description:"Description",source:"@site/docs/commands/crowdin.md",sourceDirName:"commands",slug:"/commands/crowdin",permalink:"/crowdin-cli/commands/crowdin",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/commands/crowdin.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"Configuration",permalink:"/crowdin-cli/configuration"},next:{title:"crowdin init",permalink:"/crowdin-cli/commands/crowdin-generate"}},l={},s=[{value:"Description",id:"description",level:2},{value:"Synopsis",id:"synopsis",level:2},{value:"Commands",id:"commands",level:2},{value:"Options",id:"options",level:2}],c={toc:s},m="wrapper";function d(e){let{components:n,...t}=e;return(0,a.kt)(m,(0,r.Z)({},c,t,{components:n,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"crowdin"},"crowdin"),(0,a.kt)("h2",{id:"description"},"Description"),(0,a.kt)("p",null,"Crowdin CLI is a command-line tool that allows you to manage and\nsynchronize localization resources with your Crowdin project. Visit the\nofficial documentation for more details:\n",(0,a.kt)("a",{parentName:"p",href:"https://crowdin.github.io/crowdin-cli"},"https://crowdin.github.io/crowdin-cli")),(0,a.kt)("h2",{id:"synopsis"},"Synopsis"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre"},"crowdin [SUBCOMMAND] [OPTIONS]\n")),(0,a.kt)("h2",{id:"commands"},"Commands"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-upload"},(0,a.kt)("strong",{parentName:"a"},"upload")),(0,a.kt)("br",{parentName:"p"}),"\n","Upload source files to a Crowdin project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-download"},(0,a.kt)("strong",{parentName:"a"},"download")),(0,a.kt)("br",{parentName:"p"}),"\n","Download the latest translations from Crowdin to the specified place"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-list"},(0,a.kt)("strong",{parentName:"a"},"list")),(0,a.kt)("br",{parentName:"p"}),"\n","Show a list of files, branches or target languages"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-lint"},(0,a.kt)("strong",{parentName:"a"},"lint")),(0,a.kt)("br",{parentName:"p"}),"\n","Analyze your configuration file for possible errors"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-generate"},(0,a.kt)("strong",{parentName:"a"},"generate")),(0,a.kt)("br",{parentName:"p"}),"\n","Generate Crowdin CLI configuration skeleton"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-status"},(0,a.kt)("strong",{parentName:"a"},"status")),(0,a.kt)("br",{parentName:"p"}),"\n","Show translation and proofreading progress for a project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-string"},(0,a.kt)("strong",{parentName:"a"},"string")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage source strings in a Crowdin project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-glossary"},(0,a.kt)("strong",{parentName:"a"},"glossary")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage glossaries"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-tm"},(0,a.kt)("strong",{parentName:"a"},"tm")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage translation memories"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-task"},(0,a.kt)("strong",{parentName:"a"},"task")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage tasks in a Crowdin Project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-bundle"},(0,a.kt)("strong",{parentName:"a"},"bundle")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage bundles in a Crowdin Project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-pre-translate"},(0,a.kt)("strong",{parentName:"a"},"pre-translate")),(0,a.kt)("br",{parentName:"p"}),"\n","Pre-translate files via Machine Translation (MT) or Translation Memory (TM)"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-branch"},(0,a.kt)("strong",{parentName:"a"},"branch")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage branches in a Crowdin project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-comment"},(0,a.kt)("strong",{parentName:"a"},"comment")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage string comments in a Crowdin Project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-distribution"},(0,a.kt)("strong",{parentName:"a"},"distribution")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage distributions in a Crowdin Project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-screenshot"},(0,a.kt)("strong",{parentName:"a"},"screenshot")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage screenshots in a Crowdin project"),(0,a.kt)("p",null,(0,a.kt)("a",{parentName:"p",href:"crowdin-label"},(0,a.kt)("strong",{parentName:"a"},"label")),(0,a.kt)("br",{parentName:"p"}),"\n","Manage labels in a Crowdin project"),(0,a.kt)("h2",{id:"options"},"Options"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-h"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--help"),(0,a.kt)("br",{parentName:"p"}),"\n","Display help message and exit"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-colors"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable colors and styles"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"--no-progress"),(0,a.kt)("br",{parentName:"p"}),"\n","Disable progress on executed command"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-v"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--verbose"),(0,a.kt)("br",{parentName:"p"}),"\n","Provide more information about the command execution"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"-V"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"--version"),(0,a.kt)("br",{parentName:"p"}),"\n","Display version information and exit"))}d.isMDXComponent=!0}}]);