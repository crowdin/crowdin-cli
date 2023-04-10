"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[6801],{3905:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>f});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var s=r.createContext({}),d=function(e){var t=r.useContext(s),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},c=function(e){var t=d(e.components);return r.createElement(s.Provider,{value:t},e.children)},u="mdxType",p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},g=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,s=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),u=d(n),g=a,f=u["".concat(s,".").concat(g)]||u[g]||p[g]||o;return n?r.createElement(f,i(i({ref:t},c),{},{components:n})):r.createElement(f,i({ref:t},c))}));function f(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,i=new Array(o);i[0]=g;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l[u]="string"==typeof e?e:a,i[1]=l;for(var d=2;d<o;d++)i[d]=n[d];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}g.displayName="MDXCreateElement"},5323:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>s,contentTitle:()=>i,default:()=>p,frontMatter:()=>o,metadata:()=>l,toc:()=>d});var r=n(7462),a=(n(7294),n(3905));const o={},i="Advanced Usage",l={unversionedId:"advanced",id:"advanced",title:"Advanced Usage",description:"Using CLI with Proxy Server",source:"@site/docs/advanced.md",sourceDirName:".",slug:"/advanced",permalink:"/crowdin-cli/advanced",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/cli3/website/docs/advanced.md",tags:[],version:"current",frontMatter:{},sidebar:"tutorialSidebar",previous:{title:"CI/CD Integration",permalink:"/crowdin-cli/ci-cd"},next:{title:"FAQ",permalink:"/crowdin-cli/faq"}},s={},d=[{value:"Using CLI with Proxy Server",id:"using-cli-with-proxy-server",level:3},{value:"Attach labels to the uploaded strings",id:"attach-labels-to-the-uploaded-strings",level:3},{value:"Excluding target languages for uploaded sources",id:"excluding-target-languages-for-uploaded-sources",level:3},{value:"Download Pseudo-localization",id:"download-pseudo-localization",level:3},{value:"Configure export options for each file group",id:"configure-export-options-for-each-file-group",level:3},{value:"Ignore hidden files during upload sources",id:"ignore-hidden-files-during-upload-sources",level:3}],c={toc:d},u="wrapper";function p(e){let{components:t,...n}=e;return(0,a.kt)(u,(0,r.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"advanced-usage"},"Advanced Usage"),(0,a.kt)("h3",{id:"using-cli-with-proxy-server"},"Using CLI with Proxy Server"),(0,a.kt)("p",null,"Crowdin CLI provides the possibility to work with a proxy server. Each time you run a command, Crowdin CLI checks whether the operating system has the configured environment variables."),(0,a.kt)("p",null,"Supported environment variables:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_HOST")," - the name or the IP address of the host at which the proxy server is located"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_PORT")," - the port used by the proxy server for listening"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_USER")," - the username used for authentication on a proxy server"),(0,a.kt)("li",{parentName:"ul"},(0,a.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_PASSWORD")," - the password used for authentication on a proxy server")),(0,a.kt)("h3",{id:"attach-labels-to-the-uploaded-strings"},"Attach labels to the uploaded strings"),(0,a.kt)("p",null,"There are a few ways to attach labels to the uploaded strings using the Crowdin CLI:"),(0,a.kt)("ol",null,(0,a.kt)("li",{parentName:"ol"},(0,a.kt)("p",{parentName:"li"},"Specify labels for each file-group in the ",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file:"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml" {5-8}',title:'"crowdin.yml"',"{5-8}":!0},"files: [\n    {\n        'source': '...',\n        'translation': '...',\n        'labels': [\n            'main-menu',\n            'application'\n        ]\n    }\n]\n"))),(0,a.kt)("li",{parentName:"ol"},(0,a.kt)("p",{parentName:"li"},"Specify Labels as the ",(0,a.kt)("a",{parentName:"p",href:"/commands/crowdin-upload-sources"},"crowdin upload sources")," command options:"),(0,a.kt)("pre",{parentName:"li"},(0,a.kt)("code",{parentName:"pre",className:"language-bash"},'crowdin upload sources -s "..." -t "..." --label "main-menu" -- label "application"\n')))),(0,a.kt)("h3",{id:"excluding-target-languages-for-uploaded-sources"},"Excluding target languages for uploaded sources"),(0,a.kt)("p",null,"By default, the source files are available for translation into all target languages of the project. There is a possibility to specify the languages your file shouldn't be translated into:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},"'files': [\n    {\n        'source': '...',\n        'translation': '...',\n        // highlight-next-line\n        'excluded_target_languages': ['uk', 'fr']\n    }\n]\n")),(0,a.kt)("p",null,"Or using command options:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-bash"},"crowdin upload sources --excluded-language uk fr\n")),(0,a.kt)("h3",{id:"download-pseudo-localization"},"Download Pseudo-localization"),(0,a.kt)("p",null,"You can configure and download pseudo-localized translation files."),(0,a.kt)("p",null,"To download an archive with pseudo-localized translation files:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-bash"},"crowdin download --pseudo\n")),(0,a.kt)("p",null,"Add the ",(0,a.kt)("inlineCode",{parentName:"p"},"pseudo_localization")," section to your ",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file with the following structure:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'pseudo_localization: {\n  length_correction: 25,\n  prefix: "",\n  suffix: "",\n  character_transformation: "cyrillic"\n}\n')),(0,a.kt)("p",null,"Visit the ",(0,a.kt)("a",{parentName:"p",href:"https://developer.crowdin.com/pseudolocalization/"},"KB article")," to read more about Pseudo-Localiation."),(0,a.kt)("h3",{id:"configure-export-options-for-each-file-group"},"Configure export options for each file group"),(0,a.kt)("p",null,"There is a way to specify export options for each file-group in the ",(0,a.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},"files: [\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'skip_untranslated_strings': true # Skip untranslated strings\n     },\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'skip_untranslated_files': true # Skip untranslated files\n     },\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'export_only_approved': true # Export only approved\n     },\n     { # Only for Crowdin Enterprise\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'export_string_that_passed_workflow': true # Export only strings that passed workflow\n     },\n]\n")),(0,a.kt)("h3",{id:"ignore-hidden-files-during-upload-sources"},"Ignore hidden files during upload sources"),(0,a.kt)("p",null,"To ignore hidden files during sources upload, add the following to your configuration file:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'settings: {\n    "ignore_hidden_files": false\n}\n')),(0,a.kt)("p",null,"Default value - ",(0,a.kt)("inlineCode",{parentName:"p"},"true"),"."))}p.isMDXComponent=!0}}]);