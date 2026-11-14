// Form helpers: a labelled field with a hint and an inline error message.
(function(){
    "use strict";

    const h=ContractApp.h;
    let counter=0;

    // options: {label, hint, control:"input"|"textarea"|"select",
    //           required, attributes}
    function field(options){
        counter+=1;

        const id="field-"+counter;
        const control=h(options.control || "input",Object.assign({
            id:id,
            required:options.required || null,
            "aria-describedby":options.hint ? id+"-hint" : null
        },options.attributes || {}));
        const error=h("p",{id:id+"-error",class:"error-text",hidden:true});
        const wrapper=h("div",{class:"field"},
            h("label",{for:id},
                h("span",{i18n:options.label}),
                " ",
                h("span",{
                    class:"field-note",
                    i18n:options.required ? "form.required" : "form.optional",
                    // The required attribute is already announced by screen
                    // readers, so the visible word would be read twice.
                    "aria-hidden":options.required ? "true" : null
                })
            ),
            options.hint
                ? h("p",{id:id+"-hint",class:"hint",i18n:options.hint})
                : null,
            control,
            error
        );

        // The message appears under the field, is linked to it for screen
        // readers and says how to fix the problem.
        function setError(key,values){
            if(!key){
                error.hidden=true;
                error.removeAttribute("data-i18n");
                control.removeAttribute("aria-invalid");
                control.setAttribute(
                    "aria-describedby",
                    options.hint ? id+"-hint" : ""
                );
                return;
            }

            error.setAttribute("data-i18n","validation."+key);
            error.setAttribute("data-i18n-options",JSON.stringify(values || {}));
            error.textContent=ContractApp.t("validation."+key,values);
            error.hidden=false;
            control.setAttribute("aria-invalid","true");
            control.setAttribute(
                "aria-describedby",
                (options.hint ? id+"-hint " : "")+id+"-error"
            );
        }

        return {wrapper:wrapper,control:control,setError:setError};
    }

    // Checks a text field against a minimum and maximum length.
    function checkLength(item,minimum,maximum){
        const length=item.control.value.trim().length;

        if(length===0){
            item.setError("required");
            return false;
        }

        if(length<minimum){
            item.setError("too_short",{min:minimum});
            return false;
        }

        if(length>maximum){
            item.setError("too_long",{max:maximum});
            return false;
        }

        item.setError(null);
        return true;
    }

    function focusFirstError(form){
        const invalid=form.querySelector("[aria-invalid='true']");

        if(invalid){
            invalid.focus();
        }
    }

    // Shows a failed save above the submit button.
    function showFormError(box,code){
        box.setAttribute("data-i18n","errors."+code);
        box.textContent=ContractApp.t("errors."+code);
        box.hidden=false;
    }

    ContractApp.field=field;
    ContractApp.checkLength=checkLength;
    ContractApp.focusFirstError=focusFirstError;
    ContractApp.showFormError=showFormError;
})();
