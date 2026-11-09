let generatedBlobUrl = null;

// Fane-bytte logikk
function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

async function fetchGistData() {
    const url = document.getElementById('targetUrl');
    const status = document.getElementById('status');
    const editorSection = document.getElementById('editorSection');

    status.textContent = " Henter og tolker XML-data...";
    status.style.color = "orange";

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Fetch feilet: ${response.status}`);
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");

        if (xmlDoc.querySelector("parsererror")) throw new Error("Ugyldig XML struktur.");

        // Namespace-sikre helper-funksjoner for re3data elementer
        const txt = (localName) => {
            const el = xmlDoc.getElementsByTagNameNS("*", localName);
            return el.length > 0 ? el.textContent.trim() : "";
        };

        const list = (localName) => {
            const el = xmlDoc.getElementsByTagNameNS("*", localName);
            return Array.from(el).map(e => e.textContent.trim()).filter(Boolean).join(", ");
        };

        // Populerer alle felter fra kildefilen
        document.getElementById('repoName').value = txt("repositoryName");
        document.getElementById('repoAdditionalName').value = txt("additionalName");
        document.getElementById('repoIdentifier').value = txt("repositoryIdentifierValue") || txt("re3data") || txt("doi");
        document.getElementById('repoUrl').value = txt("repositoryUrl");
        document.getElementById('description').value = txt("description");
        document.getElementById('startDate').value = txt("startDate");
        document.getElementById('repoLanguage').value = list("repositoryLanguage");
        document.getElementById('repoType').value = txt("type");
        document.getElementById('repoSize').value = txt("size");
        document.getElementById('subjects').value = list("subjectName");
        document.getElementById('suppKeywords').value = list("keyword");

        // Institusjon & Finansiering
        document.getElementById('instName').value = txt("institutionName");
        document.getElementById('instCountry').value = txt("institutionCountry");
        document.getElementById('instUrl').value = txt("institutionUrl");
        document.getElementById('instType').value = txt("institutionType");
        document.getElementById('funderName').value = txt("funderName");
        document.getElementById('funderId').value = txt("funderIdentifierValue");
        document.getElementById('grantId').value = txt("grantIdentifier");

        // Tilgang & Policy
        document.getElementById('databaseAccess').value = txt("databaseAccessType");
        document.getElementById('databaseLicense').value = list("databaseLicenseName");
        document.getElementById('dataAccess').value = list("dataAccessType");
        document.getElementById('dataLicense').value = list("dataLicenseName");
        document.getElementById('dataUpload').value = txt("dataUploadType");
        document.getElementById('dataUploadLicense').value = txt("dataUploadLicenseName");
        document.getElementById('policyUrl').value = txt("policyUrl");

        // Teknisk
        document.getElementById('software').value = txt("software");
        document.getElementById('pidSystem').value = list("pidSystem");
        document.getElementById('apiTypes').value = list("apiType");
        document.getElementById('metadataStandard').value = list("metadataStandardName");
        document.getElementById('certificate').value = list("certificateName");
        document.getElementById('versioning').value = txt("versioning");

        // Vis redigeringsskjemaet
        editorSection.classList.remove('hidden');
        status.textContent = " Data lastet suksessfullt!";
        status.style.color = "green";

    } catch (err) {
        status.textContent = ` Feil: ${err.message}`;
        status.style.color = "red";
        editorSection.classList.add('hidden');
    }
}

function generateJsonLD() {
    const output = document.getElementById('output');
    const outputSection = document.getElementById('outputSection');

    const cleanList = (id) => document.getElementById(id).value.split(',').map(v => v.trim()).filter(Boolean);
    const cleanTxt = (id) => document.getElementById(id).value.trim() || null;

    // Bygg komplett Schema.org-objekt basert på re3data-verdiene
    const jsonLD = {
        "@context": "https://schema.org",
        "@type": "DataRepository",
        "name": cleanTxt("repoName"),
        "alternateName": cleanTxt("repoAdditionalName"),
        "identifier": cleanTxt("repoIdentifier"),
        "url": cleanTxt("repoUrl"),
        "description": cleanTxt("description"),
        "dateCreated": cleanTxt("startDate"),
        "offersLanguage": cleanList("repoLanguage"),
        "keywords": cleanList("suppKeywords"),
        "creativeWorkStatus": cleanTxt("repoType"),
        
        // Mappe institusjon (Provider)
        "provider": {
            "@type": "Organization",
            "name": cleanTxt("instName"),
            "url": cleanTxt("instUrl"),
            "additionalType": cleanTxt("instType"),
            "location": {
                "@type": "PostalAddress",
                "addressCountry": cleanTxt("instCountry")
            }
        },
        "publishingPrinciples": cleanTxt("policyUrl"),
        "softwareHelp": cleanTxt("software"),
        "value": []
    };

    // Legg til Funder hvis spesifisert
    if (cleanTxt("funderName")) {
        jsonLD.funder = {
            "@type": "Organization",
            "name": cleanTxt("funderName")
        };
        if (cleanTxt("funderId")) {
            jsonLD.funder.identifier = cleanTxt("funderId");
        }
    }

    // Tilleggsparametere lagt i en "value"-matrise (PropertyValues)
    if (cleanTxt("repoSize")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Repository Size", "value": cleanTxt("repoSize") });
    if (cleanTxt("databaseAccess")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Database Access", "value": cleanTxt("databaseAccess") });
    if (cleanTxt("databaseLicense")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Database License", "value": cleanTxt("databaseLicense") });
    if (cleanTxt("dataUpload")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Data Upload Restriction", "value": cleanTxt("dataUpload") });
    if (cleanTxt("versioning")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Supports Versioning", "value": cleanTxt("versioning") });
    if (cleanTxt("grantId")) jsonLD.value.push({ "@type": "PropertyValue", "name": "Grant Identifier", "value": cleanTxt("grantId") });

    cleanList("subjects").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "Subject Area", "value": val }));
    cleanList("pidSystem").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "PID System", "value": val }));
    cleanList("apiTypes").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "Supported API", "value": val }));
    cleanList("metadataStandard").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "Metadata Standard", "value": val }));
    cleanList("certificate").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "Certification", "value": val }));
    cleanList("dataLicense").forEach(val => jsonLD.value.push({ "@type": "PropertyValue", "name": "Data License", "value": val }));

    const comment = cleanTxt("suppComment");
    if (comment) {
        jsonLD.comment = { "@type": "Comment", "text": comment };
    }

    // Injiser i head
    const oldScript = document.getElementById('gist-jsonld');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'gist-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLD, null, 2);
    document.head.appendChild(script);

    // Gjør klar for visning og nedlasting
    output.textContent = script.text;
    outputSection.classList.remove('hidden');

    if (generatedBlobUrl) URL.revokeObjectURL(generatedBlobUrl);
    const blob = new Blob([script.text], { type: "application/ld+json" });
    generatedBlobUrl = URL.createObjectURL(blob);
}

function downloadJsonLD() {
    if (!generatedBlobUrl) return;
    const filename = (document.getElementById('repoName').value.trim() || 'repository-metadata')
        .toLowerCase().replace(/[^a-z0-9]/g, '-') + '.jsonld';
    
    const a = document.createElement('a');
    a.href = generatedBlobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
