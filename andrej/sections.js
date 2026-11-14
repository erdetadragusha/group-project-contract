// Screen 02 – Contract Sections: the full text of every rule.
(function(){
    "use strict";

    const app=ContractApp;
    const h=app.h;
    const content=document.querySelector("#content");

    async function load(context){
        const sections=await app.request(
            database.from("contract_sections")
                .select("id,kind,body,status,updated_at")
                .eq("contract_id",context.contract.id)
                .order("position",{ascending:true})
        );

        const pending=await app.request(
            database.from("change_requests")
                .select("id,section_id")
                .eq("contract_id",context.contract.id)
                .eq("status","pending")
        );

        return {sections:sections,pending:pending};
    }

    function render(context,data){
        app.fill(content,
            h("p",{class:"muted",i18n:["sections.intro",{
                count:data.sections.length,
                version:context.contract.version
            }]}),
            h("div",null,data.sections.map(function(section,index){
                const waiting=data.pending.filter(function(item){
                    return item.section_id===section.id;
                }).length;

                return h("section",{class:"card","aria-labelledby":"section-"+section.id},
                    h("div",{class:"row-between"},
                        h("h2",{id:"section-"+section.id},
                            h("span",{class:"muted",text:(index+1)+". "}),
                            h("span",{i18n:"sectionKind."+section.kind})
                        ),
                        app.badge(section.status)
                    ),
                    h("p",{text:section.body}),
                    h("p",{class:"muted small",i18n:["sections.updated",{
                        date:app.formatDate(section.updated_at)
                    }]}),
                    waiting>0
                        ? h("a",{
                            class:"link-row",
                            href:app.url("changes.html",{status:"pending"}),
                            i18n:["sections.pendingLink",{count:waiting}]
                        })
                        : h("a",{
                            class:"button button-secondary",
                            href:app.url("propose.html",{section:section.id}),
                            i18n:"sections.proposeHere"
                        })
                );
            }))
        );
    }

    app.start({load:load,render:render});
})();
