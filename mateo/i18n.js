(async function(){
    const selector=document.querySelector("#language-select");
    const message=document.querySelector("#language-message");
    const languages=["en","hr","sq"];

    if(selector){
        selector.disabled=true;
    }

    function translate(key,options={}){
        if(!i18next.exists(key)){
            console.warn("Missing translation:",key);
            return i18next.t("auth.errors.generic");
        }

        return i18next.t(key,options);
    }

    function getOptions(element){
        const options=element.getAttribute("data-i18n-options");

        if(!options){
            return {};
        }

        try{
            const parsed=JSON.parse(options);

            if(parsed && typeof parsed==="object" && !Array.isArray(parsed)){
                return parsed;
            }
        }catch(error){
            console.warn("Invalid translation options:",error);
        }

        return {};
    }

    function updateText(){
        document.documentElement.lang=i18next.resolvedLanguage;
        document.documentElement.dir="ltr";

        document.querySelectorAll("[data-i18n]").forEach(function(element){
            const key=element.getAttribute("data-i18n");

            element.textContent=translate(key,getOptions(element));
        });

        document.querySelectorAll("[data-i18n-aria]").forEach(function(element){
            const key=element.getAttribute("data-i18n-aria");

            element.setAttribute(
                "aria-label",
                translate(key,getOptions(element))
            );
        });

        if(selector){
            selector.value=i18next.resolvedLanguage;
        }
    }

    async function loadLanguage(language){
        const controller=new AbortController();

        const timer=setTimeout(function(){
            controller.abort();
        },10000);

        try{
            const response=await fetch(
                "locales/"+language+".json",
                {signal:controller.signal}
            );

            if(!response.ok){
                throw new Error("Could not load locale: "+language);
            }

            return await response.json();
        }finally{
            clearTimeout(timer);
        }
    }

    try{
        const resources={
            en:{
                translation:await loadLanguage("en")
            }
        };

        const additionalLanguages=["hr","sq"];

        const results=await Promise.allSettled(
            additionalLanguages.map(loadLanguage)
        );

        results.forEach(function(result,index){
            const language=additionalLanguages[index];

            if(result.status==="fulfilled"){
                resources[language]={
                    translation:result.value
                };
            }else{
                console.warn("Language unavailable:",language);
            }
        });

        let savedLanguage="en";

        try{
            const saved=localStorage.getItem("appLanguage");

            if(languages.includes(saved) && resources[saved]){
                savedLanguage=saved;
            }
        }catch(error){
            savedLanguage="en";
        }

        await i18next.init({
            lng:savedLanguage,
            supportedLngs:languages,
            fallbackLng:"en",
            resources:resources,
            interpolation:{
                escapeValue:false
            }
        });

        updateText();

        if(message){
            message.hidden=true;
        }

        if(selector){
            Array.from(selector.options).forEach(function(option){
                option.disabled=!resources[option.value];
            });

            selector.disabled=false;

            selector.addEventListener("change",async function(){
                const selected=selector.value;

                if(!languages.includes(selected) || !resources[selected]){
                    return;
                }

                await i18next.changeLanguage(selected);
                updateText();

                try{
                    localStorage.setItem("appLanguage",selected);
                }catch(error){
                    // The language still changes without browser storage.
                }
            });
        }
    }catch(error){
        console.error(error);

        if(message){
            message.hidden=false;
        }
    }
})();