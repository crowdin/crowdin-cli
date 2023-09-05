"use strict";(self.webpackChunkcrowdin_cli_website=self.webpackChunkcrowdin_cli_website||[]).push([[6801],{3905:(e,n,t)=>{t.d(n,{Zo:()=>c,kt:()=>m});var a=t(7294);function i(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function r(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){i(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,a,i=function(e,n){if(null==e)return{};var t,a,i={},o=Object.keys(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||(i[t]=e[t]);return i}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var p=a.createContext({}),s=function(e){var n=a.useContext(p),t=n;return e&&(t="function"==typeof e?e(n):r(r({},n),e)),t},c=function(e){var n=s(e.components);return a.createElement(p.Provider,{value:n},e.children)},d="mdxType",u={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},g=a.forwardRef((function(e,n){var t=e.components,i=e.mdxType,o=e.originalType,p=e.parentName,c=l(e,["components","mdxType","originalType","parentName"]),d=s(t),g=i,m=d["".concat(p,".").concat(g)]||d[g]||u[g]||o;return t?a.createElement(m,r(r({ref:n},c),{},{components:t})):a.createElement(m,r({ref:n},c))}));function m(e,n){var t=arguments,i=n&&n.mdxType;if("string"==typeof e||i){var o=t.length,r=new Array(o);r[0]=g;var l={};for(var p in n)hasOwnProperty.call(n,p)&&(l[p]=n[p]);l.originalType=e,l[d]="string"==typeof e?e:i,r[1]=l;for(var s=2;s<o;s++)r[s]=t[s];return a.createElement.apply(null,r)}return a.createElement.apply(null,t)}g.displayName="MDXCreateElement"},5323:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>p,contentTitle:()=>r,default:()=>u,frontMatter:()=>o,metadata:()=>l,toc:()=>s});var a=t(7462),i=(t(7294),t(3905));const o={description:"Unlock the full potential of the Crowdin CLI. Dive deeper into advanced techniques, tips, and tricks for leveraging the capabilities of the CLI tool."},r="Advanced Usage",l={unversionedId:"advanced",id:"advanced",title:"Advanced Usage",description:"Unlock the full potential of the Crowdin CLI. Dive deeper into advanced techniques, tips, and tricks for leveraging the capabilities of the CLI tool.",source:"@site/docs/advanced.md",sourceDirName:".",slug:"/advanced",permalink:"/crowdin-cli/advanced",draft:!1,editUrl:"https://github.com/crowdin/crowdin-cli/tree/main/website/docs/advanced.md",tags:[],version:"current",frontMatter:{description:"Unlock the full potential of the Crowdin CLI. Dive deeper into advanced techniques, tips, and tricks for leveraging the capabilities of the CLI tool."},sidebar:"tutorialSidebar",previous:{title:"CI/CD Integration",permalink:"/crowdin-cli/ci-cd"},next:{title:"FAQ",permalink:"/crowdin-cli/faq"}},p={},s=[{value:"Using CLI with Proxy Server",id:"using-cli-with-proxy-server",level:3},{value:"Attach labels to the uploaded strings",id:"attach-labels-to-the-uploaded-strings",level:3},{value:"Excluding target languages for uploaded sources",id:"excluding-target-languages-for-uploaded-sources",level:3},{value:"Languages mapping configuration",id:"languages-mapping-configuration",level:3},{value:"Download Pseudo-localization",id:"download-pseudo-localization",level:3},{value:"Export configuration for specific file formats",id:"export-configuration-for-specific-file-formats",level:3},{value:"Java Properties",id:"java-properties",level:4},{value:"JavaScript",id:"javascript",level:4},{value:"Configure export options for each file group",id:"configure-export-options-for-each-file-group",level:3},{value:"Ignore hidden files during upload sources",id:"ignore-hidden-files-during-upload-sources",level:3}],c={toc:s},d="wrapper";function u(e){let{components:n,...t}=e;return(0,i.kt)(d,(0,a.Z)({},c,t,{components:n,mdxType:"MDXLayout"}),(0,i.kt)("h1",{id:"advanced-usage"},"Advanced Usage"),(0,i.kt)("h3",{id:"using-cli-with-proxy-server"},"Using CLI with Proxy Server"),(0,i.kt)("p",null,"Crowdin CLI provides the possibility to work with a proxy server. Each time you run a command, Crowdin CLI checks whether the operating system has the configured environment variables."),(0,i.kt)("p",null,"Supported environment variables:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_HOST")," - the name or the IP address of the host at which the proxy server is located"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_PORT")," - the port used by the proxy server for listening"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_USER")," - the username used for authentication on a proxy server"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"HTTP_PROXY_PASSWORD")," - the password used for authentication on a proxy server")),(0,i.kt)("h3",{id:"attach-labels-to-the-uploaded-strings"},"Attach labels to the uploaded strings"),(0,i.kt)("p",null,"There are a few ways to attach labels to the uploaded strings using the Crowdin CLI:"),(0,i.kt)("ol",null,(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"Specify labels for each file-group in the ",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml" {5-8}',title:'"crowdin.yml"',"{5-8}":!0},"files: [\n    {\n        'source': '...',\n        'translation': '...',\n        'labels': [\n            'main-menu',\n            'application'\n        ]\n    }\n]\n"))),(0,i.kt)("li",{parentName:"ol"},(0,i.kt)("p",{parentName:"li"},"Specify Labels as the ",(0,i.kt)("a",{parentName:"p",href:"/commands/crowdin-upload-sources"},"crowdin upload sources")," command options:"),(0,i.kt)("pre",{parentName:"li"},(0,i.kt)("code",{parentName:"pre",className:"language-bash"},'crowdin upload sources -s "..." -t "..." --label "main-menu" -- label "application"\n')))),(0,i.kt)("h3",{id:"excluding-target-languages-for-uploaded-sources"},"Excluding target languages for uploaded sources"),(0,i.kt)("p",null,"By default, the source files are available for translation into all target languages of the project. There is a possibility to specify the languages your file shouldn't be translated into:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},"'files': [\n    {\n        'source': '...',\n        'translation': '...',\n        // highlight-next-line\n        'excluded_target_languages': ['uk', 'fr']\n    }\n]\n")),(0,i.kt)("p",null,"Or using command options:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-bash"},"crowdin upload sources --excluded-language uk fr\n")),(0,i.kt)("h3",{id:"languages-mapping-configuration"},"Languages mapping configuration"),(0,i.kt)("p",null,"Often software projects have custom names for locale directories. Crowdin allows you to map your own languages to be recognizable in your projects."),(0,i.kt)("p",null,"Let's say your locale directories are named ",(0,i.kt)("inlineCode",{parentName:"p"},"en"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"uk"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"fr"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"de"),". All of them can be represented by the ",(0,i.kt)("inlineCode",{parentName:"p"},"%two_letters_code%")," placeholder. Still, you have one directory named ",(0,i.kt)("inlineCode",{parentName:"p"},"zh_CH"),". You can also override language codes for other placeholders like ",(0,i.kt)("inlineCode",{parentName:"p"},"%android_code%"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"%locale%"),", etc."),(0,i.kt)("p",null,"To set up Language Mapping in your configuration file, add the ",(0,i.kt)("inlineCode",{parentName:"p"},"languages_mapping")," section to your file set as shown below:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'"files": [\n   {\n      "source": "/locale/en/**/*.po",\n      "translation": "/locale/%two_letters_code%/**/%original_file_name%",\n      "languages_mapping": {\n         "two_letters_code": {\n            "uk": "ukr",\n            "pl": "pol"\n         }\n      }\n   }\n]\n')),(0,i.kt)("p",null,"Note that in the example above, we are configuring mapping for the ",(0,i.kt)("inlineCode",{parentName:"p"},"two_letters_code")," placeholder because it is specified in the ",(0,i.kt)("inlineCode",{parentName:"p"},"translation")," pattern. If you use a different language placeholder in your ",(0,i.kt)("inlineCode",{parentName:"p"},"translation")," pattern, you should also specify this placeholder in the ",(0,i.kt)("inlineCode",{parentName:"p"},"languages_mapping")," configuration."),(0,i.kt)("admonition",{type:"caution"},(0,i.kt)("p",{parentName:"admonition"},"The mapping format is the following: ",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin_language_code"),": ",(0,i.kt)("inlineCode",{parentName:"p"},"code_you_use"),". Check the full list of ",(0,i.kt)("a",{parentName:"p",href:"https://developer.crowdin.com/language-codes/"},"Crowdin language codes")," that can be used for mapping.")),(0,i.kt)("admonition",{type:"tip"},(0,i.kt)("p",{parentName:"admonition"},"Languages Mapping can be also configured in your crowdin.com or Crowdin Enterprise ",(0,i.kt)("em",{parentName:"p"},"Project Settings")," > ",(0,i.kt)("em",{parentName:"p"},"Languages")," section.")),(0,i.kt)("h3",{id:"download-pseudo-localization"},"Download Pseudo-localization"),(0,i.kt)("p",null,"You can configure and download pseudo-localized translation files."),(0,i.kt)("p",null,"To download an archive with pseudo-localized translation files:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-bash"},"crowdin download --pseudo\n")),(0,i.kt)("p",null,"Add the ",(0,i.kt)("inlineCode",{parentName:"p"},"pseudo_localization")," section to your ",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file with the following structure:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'pseudo_localization: {\n  length_correction: 25,\n  prefix: "",\n  suffix: "",\n  character_transformation: "cyrillic"\n}\n')),(0,i.kt)("p",null,"Visit the ",(0,i.kt)("a",{parentName:"p",href:"https://developer.crowdin.com/pseudolocalization/"},"KB article")," to read more about Pseudo-Localiation."),(0,i.kt)("h3",{id:"export-configuration-for-specific-file-formats"},"Export configuration for specific file formats"),(0,i.kt)("h4",{id:"java-properties"},"Java Properties"),(0,i.kt)("p",null,(0,i.kt)("strong",{parentName:"p"},"Escape Quotes")),(0,i.kt)("p",null,"The ",(0,i.kt)("inlineCode",{parentName:"p"},"escape_qutes")," option defines whether a single quote should be escaped by another single quote or backslash in exported translations. You can add the ",(0,i.kt)("inlineCode",{parentName:"p"},"escape_quotes")," per-file option. Acceptable values are ",(0,i.kt)("inlineCode",{parentName:"p"},"0"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"1"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"2"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"3"),". Default is ",(0,i.kt)("inlineCode",{parentName:"p"},"3"),"."),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"0")," - do not escape"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"1")," - escape single quote with another single quote"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"2")," - escape single quote with a backslash"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"3")," - escape single quote with another single quote only in strings containing variables ( {0} )")),(0,i.kt)("p",null,(0,i.kt)("strong",{parentName:"p"},"Escape special characters")),(0,i.kt)("p",null,"Defines whether any special characters (",(0,i.kt)("inlineCode",{parentName:"p"},"="),", ",(0,i.kt)("inlineCode",{parentName:"p"},":"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"!")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"#"),") should be escaped by a backslash in exported translations. You can add the ",(0,i.kt)("inlineCode",{parentName:"p"},"escape_special_characters")," per-file option. Acceptable values are ",(0,i.kt)("inlineCode",{parentName:"p"},"0"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"1"),". Default is ",(0,i.kt)("inlineCode",{parentName:"p"},"1"),"."),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"0")," - do not escape special characters"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"1")," - escape special characters by a backslash")),(0,i.kt)("p",null,"Example of the configuration:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'"files": [\n  {\n    "source": "/en/strings.properties",\n    "translation": "/%two_letters_code%/%original_file_name%",\n    "escape_quotes": 1,\n    "escape_special_characters": 0\n  }\n]\n')),(0,i.kt)("h4",{id:"javascript"},"JavaScript"),(0,i.kt)("p",null,(0,i.kt)("strong",{parentName:"p"},"Export Quotes")),(0,i.kt)("p",null,"The ",(0,i.kt)("inlineCode",{parentName:"p"},"export_quotes")," option defines the type of quotes to use in exported translations. You can add the ",(0,i.kt)("inlineCode",{parentName:"p"},"export_quotes")," per-file option. Acceptable values are ",(0,i.kt)("inlineCode",{parentName:"p"},"single"),", ",(0,i.kt)("inlineCode",{parentName:"p"},"double"),". Default is ",(0,i.kt)("inlineCode",{parentName:"p"},"single"),"."),(0,i.kt)("p",null,"Example of the configuration:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'"files": [\n  {\n    "source": "/en/strings.js",\n    "translation": "/%two_letters_code%/%original_file_name%",\n    "export_quotes": "double"\n  }\n]\n')),(0,i.kt)("h3",{id:"configure-export-options-for-each-file-group"},"Configure export options for each file group"),(0,i.kt)("p",null,"There is a way to specify export options for each file-group in the ",(0,i.kt)("inlineCode",{parentName:"p"},"crowdin.yml")," configuration file:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},"files: [\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'skip_untranslated_strings': true # Skip untranslated strings\n     },\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'skip_untranslated_files': true # Skip untranslated files\n     },\n     {\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'export_only_approved': true # Export only approved\n     },\n     { # Only for Crowdin Enterprise\n         'source': '...',\n         'translation': '...',\n         // highlight-next-line\n         'export_string_that_passed_workflow': true # Export only strings that passed workflow\n     },\n]\n")),(0,i.kt)("h3",{id:"ignore-hidden-files-during-upload-sources"},"Ignore hidden files during upload sources"),(0,i.kt)("p",null,"To ignore hidden files during sources upload, add the following to your configuration file:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-yml",metastring:'title="crowdin.yml"',title:'"crowdin.yml"'},'settings: {\n    "ignore_hidden_files": false\n}\n')),(0,i.kt)("p",null,"Default value - ",(0,i.kt)("inlineCode",{parentName:"p"},"true"),"."))}u.isMDXComponent=!0}}]);