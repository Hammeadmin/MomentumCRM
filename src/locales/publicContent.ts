/**
 * Deep Public Website Content - Swedish
 * 
 * Real content with specific numbers, authentic Swedish business language,
 * and content structured for separate pages.
 */

export const sv = {
    // =========================================================================
    // NAVIGATION
    // =========================================================================
    nav: {
        features: 'Funktioner',
        pricing: 'Pris',
        customers: 'Kunder',
        about: 'Om oss',
        contact: 'Kontakt',
        login: 'Logga in',
        getStarted: 'Boka demo',
        tryFree: 'Testa gratis',
    },

    // =========================================================================
    // LANDING PAGE - Hero
    // =========================================================================
    hero: {
        headline: 'Affärssystemet som faktiskt används',
        subheadline: 'Över 1,800 svenska företag har bytt från kaotiska kalkylark till ett sammanhållet flöde. CRM, offert och faktura – i ett gränssnitt ditt team redan förstår.',
        stats: [
            { value: '12h', label: 'sparad tid per vecka', sublabel: 'i genomsnitt' },
            { value: '34%', label: 'högre hitrate', sublabel: 'efter 3 månader' },
            { value: '< 30s', label: 'Fortnox-synk', sublabel: 'per faktura' },
        ],
        cta: {
            primary: 'Se hur det fungerar',
            secondary: 'Prata med oss',
        },
    },

    // =========================================================================
    // LANDING PAGE - Problem/Solution
    // =========================================================================
    problem: {
        headline: 'Du känner igen det här',
        items: [
            {
                stat: '37%',
                description: 'av säljares tid går till administration istället för försäljning',
                source: 'Salesforce Research, 2024',
            },
            {
                stat: '4.2',
                description: 'olika system används i genomsnitt för att hantera en säljprocess',
                source: 'Nucleus Research',
            },
            {
                stat: '23%',
                description: 'av intäkter förloras på grund av dålig lead-hantering',
                source: 'Harvard Business Review',
            },
        ],
        solution: {
            headline: 'Ett system. Hela flödet.',
            description: 'Från första kundkontakt till betald faktura. Inget kopiering mellan system. Inga tappade leads. Ingen dubbel bokföring.',
        },
    },

    // =========================================================================
    // LANDING PAGE - Case Studies (Kundcase)
    // =========================================================================
    caseStudies: {
        headline: 'Företag som gjort bytet',
        subheadline: 'Verkliga resultat från svenska bolag i olika branscher',
        items: [
            {
                company: 'Ren Fasad Stockholm AB',
                industry: 'Fastighetstjänster',
                image: 'CASE_STUDY_SERVICE',
                quote: 'Vi gick från att jaga papper till att jaga affärer. Våra säljare ringer 40% fler kunder nu.',
                author: 'Marcus Lindqvist',
                role: 'VD',
                metrics: [
                    { label: 'Ökad försäljning', value: '+28%' },
                    { label: 'Tid på admin', value: '-65%' },
                    { label: 'Faktureringstid', value: '2 dagar → 2 timmar' },
                ],
                link: '/kundcase/ren-fasad',
            },
            {
                company: 'Byggpartner Mälardalen',
                industry: 'Bygg & Entreprenad',
                image: 'CASE_STUDY_BYGG',
                quote: 'ROT-hanteringen var en mardröm. Nu sköter systemet allt och vi får pengarna snabbare.',
                author: 'Anna Bergström',
                role: 'Ekonomiansvarig',
                metrics: [
                    { label: 'ROT-ärenden/månad', value: '45+' },
                    { label: 'Fel på fakturor', value: '0' },
                    { label: 'Kassaflöde förbättrat', value: '+18 dagar' },
                ],
                link: '/kundcase/byggpartner',
            },
        ],
    },

    // =========================================================================
    // FEATURES PAGE - Overview
    // =========================================================================
    features: {
        headline: 'Byggt för hur du faktiskt jobbar',
        subheadline: 'Inte ytterligare ett CRM som kräver en konsult för att sätta upp. Momentum fungerar direkt.',
        categories: [
            {
                id: 'crm',
                title: 'CRM & Leads',
                tagline: 'Sluta tappa kunder i sprickor',
                description: 'Visuell pipeline där du drar leads mellan steg. Automatiska påminnelser. Full historik på varje kund.',
                href: '/funktioner/crm',
                image: 'FEATURE_CRM',
                highlights: [
                    'Kanban-vy för hela säljprocessen',
                    'Automatisk lead-scoring',
                    'Samtalslogg och anteckningar',
                    'Import från Excel på 30 sekunder',
                ],
            },
            {
                id: 'quotes',
                title: 'Offert & Avtal',
                tagline: 'Från förfrågan till signatur',
                description: 'Skapa proffsiga offerter på minuter. Digital signering. Automatisk påminnelse om kunden inte svarat.',
                href: '/funktioner/offert',
                image: 'WORKFLOW_AFTER',
                highlights: [
                    'Mallar som sparar tid',
                    'ROT/RUT-beräkning inbyggd',
                    'Digital signering',
                    'Automatisk uppföljning',
                ],
            },
            {
                id: 'invoicing',
                title: 'Fakturering',
                tagline: 'Synk med Fortnox på 30 sekunder',
                description: 'Skapa faktura direkt från order. Automatisk synk med Fortnox. OCR-nummer genereras. Inga manuella steg.',
                href: '/funktioner/fakturering',
                image: 'FEATURE_INVOICING',
                highlights: [
                    'Ett klick: order → faktura',
                    'Fortnox-integration',
                    'ROT-underlag automatiskt',
                    'Påminnelser vid förfallodatum',
                ],
            },
            {
                id: 'teams',
                title: 'Team & Projekt',
                tagline: 'Schemalägg. Tilldela. Leverera.',
                description: 'Se vem som gör vad och när. Tilldela jobb till team eller individer. Tidsrapportering i fält.',
                href: '/funktioner/team',
                image: 'FEATURE_PROJECTS',
                highlights: [
                    'Drag-and-drop schemaläggning',
                    'Mobilapp för fältpersonal',
                    'Tidrapportering med foto',
                    'Automatisk löneunderlag',
                ],
            },
        ],
        integrations: {
            headline: 'Fungerar med det du redan använder',
            items: [
                { name: 'Fortnox', description: 'Tvåvägssynk av fakturor och kunder' },
                { name: 'Google Kalender', description: 'Möten synkas automatiskt' },
                { name: '46elks', description: 'SMS-utskick direkt från systemet' },
                { name: 'Resend', description: 'Transaktionsmail som faktiskt kommer fram' },
            ],
        },
    },

    // =========================================================================
    // PRICING PAGE
    // =========================================================================
    pricing: {
        headline: 'Enkel prissättning utan överraskningar',
        subheadline: 'Betala för vad du använder. Ingen bindningstid. Avsluta när du vill.',
        toggle: {
            monthly: 'Månadsvis',
            yearly: 'Årsvis',
            yearlySave: '2 månader gratis',
        },
        plans: [
            {
                id: 'solo',
                name: 'Solo',
                description: 'För enskilda firmor och konsulter',
                monthlyPrice: 199,
                yearlyPrice: 1990,
                features: [
                    { text: '1 användare', included: true },
                    { text: 'Upp till 200 kunder', included: true },
                    { text: 'CRM & Lead-hantering', included: true },
                    { text: 'Offerter & Fakturor', included: true },
                    { text: 'E-postsupport', included: true },
                    { text: 'Fortnox-integration', included: false },
                    { text: 'Team-funktioner', included: false },
                    { text: 'API-åtkomst', included: false },
                ],
                cta: 'Starta gratis',
                popular: false,
            },
            {
                id: 'team',
                name: 'Team',
                description: 'För växande säljteam och småföretag',
                monthlyPrice: 599,
                yearlyPrice: 5990,
                features: [
                    { text: 'Upp till 10 användare', included: true },
                    { text: 'Obegränsade kunder', included: true },
                    { text: 'Allt i Solo, plus:', included: true, header: true },
                    { text: 'Fortnox-synk i realtid', included: true },
                    { text: 'Team-schemaläggning', included: true },
                    { text: 'SMS-utskick (46elks)', included: true },
                    { text: 'Prioriterad support', included: true },
                    { text: 'API-åtkomst', included: false },
                ],
                cta: 'Starta 14 dagars test',
                popular: true,
            },
            {
                id: 'enterprise',
                name: 'Företag',
                description: 'För stora team med speciella behov',
                monthlyPrice: null,
                yearlyPrice: null,
                features: [
                    { text: 'Obegränsade användare', included: true },
                    { text: 'Allt i Team, plus:', included: true, header: true },
                    { text: 'Dedikerad kontaktperson', included: true },
                    { text: 'Anpassad onboarding', included: true },
                    { text: 'API & Webhooks', included: true },
                    { text: 'SSO (SAML)', included: true },
                    { text: 'SLA-garanti', included: true },
                    { text: 'On-premise möjligt', included: true },
                ],
                cta: 'Kontakta oss',
                popular: false,
            },
        ],
        faq: [
            {
                question: 'Kan jag testa utan att lämna kortuppgifter?',
                answer: 'Ja. Du får 14 dagar gratis på Team-planen utan att behöva ange betalningsuppgifter. Om du inte uppgraderar efter testperioden nedgraderas kontot automatiskt till gratisversionen.',
            },
            {
                question: 'Vad händer med min data om jag avslutar?',
                answer: 'Du kan exportera all data (kunder, fakturor, leads) som JSON eller CSV. Efter avslut sparas data i 30 dagar innan den raderas permanent, enligt GDPR.',
            },
            {
                question: 'Ingår support?',
                answer: 'Alla planer inkluderar e-postsupport på svenska. Team och Företag får prioriterad support med svar inom 4 timmar på vardagar.',
            },
            {
                question: 'Kan jag byta plan senare?',
                answer: 'Ja. Uppgradera eller nedgradera när som helst. Vid uppgradering betalar du mellanskillnaden. Vid nedgradering får du kredit för framtida betalningar.',
            },
        ],
    },

    // =========================================================================
    // ABOUT PAGE
    // =========================================================================
    about: {
        headline: 'Byggt av människor som förstår svenska företag',
        intro: 'Momentum startades 2022 av ett team som var trött på att se svenska småföretag kämpa med amerikanska CRM-system som aldrig riktigt passade. Vi byggde det system vi själva ville ha.',
        story: {
            headline: 'Varför vi startade',
            paragraphs: [
                'Som konsulter såg vi samma problem överallt: duktiga hantverkare och säljare som förlorade timmar varje vecka på att flytta data mellan system. Excel till CRM. CRM till Fortnox. Fortnox till Excel igen.',
                'De stora systemen var för dyra och komplexa. De billiga var för simpla. Ingen var byggd för svenska regler – ROT-avdrag, BankID, Fortnox-integration.',
                'Så vi byggde Momentum. Ett system där hela flödet hänger ihop. Där ROT fungerar utan att du behöver tänka. Där fakturan hamnar i Fortnox innan du hunnit stänga fönstret.',
            ],
        },
        values: [
            {
                title: 'Enkelhet framför allt',
                description: 'Om det kräver en manual är det för komplicerat. Våra användare ska kunna börja jobba samma dag de registrerar sig.',
            },
            {
                title: 'Svenskt först',
                description: 'Vi bygger för svenska regler, svenska integrationer och svensk affärskultur. Inte översatta amerikanska produkter.',
            },
            {
                title: 'Transparens',
                description: 'Inga dolda avgifter. Ingen inlåsning. Du äger din data och kan exportera den när som helst.',
            },
        ],
        team: {
            headline: 'Teamet',
            members: [
                { name: 'Erik Lindström', role: 'VD & Grundare', image: 'TEAM_FOUNDER' },
            ],
        },
        office: {
            headline: 'Baserade i Stockholm',
            address: 'Momentum CRM AB\nBirger Jarlsgatan 57\n113 56 Stockholm',
            image: 'OFFICE_SPACE',
        },
    },

    // =========================================================================
    // CONTACT PAGE
    // =========================================================================
    contact: {
        headline: 'Låt oss prata',
        subheadline: 'Oavsett om du har en fråga eller vill se en demo – vi finns här.',
        form: {
            name: 'Ditt namn',
            email: 'E-post',
            phone: 'Telefon (valfritt)',
            company: 'Företag',
            employees: 'Antal anställda',
            employeeOptions: ['1-5', '6-20', '21-50', '51+'],
            message: 'Hur kan vi hjälpa dig?',
            submit: 'Skicka meddelande',
            submitting: 'Skickar...',
            success: 'Tack! Vi återkommer inom 24 timmar.',
        },
        alternatives: {
            headline: 'Eller nå oss direkt',
            email: 'hej@momentum-crm.se',
            phone: '+46 8 123 45 67',
            hours: 'Mån–Fre 09:00–17:00',
        },
    },

    // =========================================================================
    // ROI CALCULATOR MODAL
    // =========================================================================
    roiCalculator: {
        headline: 'Se din potentiella besparing',
        inputs: {
            employees: 'Antal säljare/administratörer',
            hoursPerWeek: 'Timmar på admin per person/vecka',
            hourlyCost: 'Intern timkostnad (SEK)',
        },
        results: {
            weeklySavings: 'Uppskattad besparing per vecka',
            yearlySavings: 'Uppskattad besparing per år',
            note: 'Baserat på genomsnittlig 60% tidsbesparing för våra kunder',
        },
        cta: 'Boka en genomgång',
    },

    // =========================================================================
    // DEMO REQUEST MODAL
    // =========================================================================
    demoRequest: {
        headline: 'Boka en personlig demo',
        subheadline: '20 minuter. Inga säljpitchar. Vi visar hur det fungerar för just ditt företag.',
        form: {
            name: 'Ditt namn',
            email: 'E-post',
            phone: 'Telefon',
            company: 'Företagsnamn',
            website: 'Hemsida (valfritt)',
            employees: 'Antal anställda',
            industry: 'Bransch',
            industryOptions: [
                'Bygg & Entreprenad',
                'Fastighetstjänster',
                'Konsulting',
                'Handel',
                'Annat',
            ],
            currentSystem: 'Vad använder ni idag?',
            systemOptions: ['Excel/Google Sheets', 'Annat CRM', 'Inget system', 'Vet ej'],
            submit: 'Boka demo',
        },
        confirmation: {
            headline: 'Tack för din bokning!',
            description: 'Vi hör av oss inom 24 timmar för att hitta en tid som passar.',
        },
    },

    // =========================================================================
    // FOOTER
    // =========================================================================
    footer: {
        tagline: 'Mindre krångel. Mer affärer.',
        columns: [
            {
                title: 'Produkt',
                links: [
                    { label: 'Funktioner', href: '/funktioner' },
                    { label: 'Prissättning', href: '/pris' },
                    { label: 'Integrationer', href: '/funktioner#integrationer' },
                ],
            },
            {
                title: 'Företag',
                links: [
                    { label: 'Om oss', href: '/om-oss' },
                    { label: 'Kunder', href: '/kundcase' },
                    { label: 'Kontakt', href: '/kontakt' },
                ],
            },
            {
                title: 'Support',
                links: [
                    { label: 'Kontakta oss', href: '/kontakt' },
                ],
            },
            {
                title: 'Juridiskt',
                links: [
                    { label: 'Integritetspolicy', href: '/integritetspolicy' },
                    { label: 'Användarvillkor', href: '/anvandarvillkor' },
                ],
            },
        ],
        copyright: '© 2026 Momentum CRM AB. Org.nr 559XXX-XXXX.',
        location: 'Stockholm, Sverige',
    },

    // =========================================================================
    // LEGAL PAGES
    // =========================================================================
    legal: {
        privacy: {
            title: 'Integritetspolicy',
            lastUpdated: 'Senast uppdaterad: 20 januari 2026',
            sections: [
                {
                    heading: '1. Personuppgiftsansvarig',
                    content: 'Momentum CRM AB, org.nr 559XXX-XXXX, Birger Jarlsgatan 57, 113 56 Stockholm, ansvarar för behandlingen av dina personuppgifter. För frågor om personuppgiftshantering, kontakta privacy@momentum-crm.se.',
                },
                {
                    heading: '2. Kategorier av personuppgifter',
                    content: 'Vi behandlar följande uppgifter: Kontouppgifter (namn, e-post, telefon, lösenord i krypterad form). Företagsinformation (företagsnamn, org.nr, adress, bransch). Användningsdata (inloggningar, aktivitetsloggar, funktioner som används). Tekniska uppgifter (IP-adress, enhetstyp, webbläsare, operativsystem). Supportärenden (korrespondens, bifogade filer). Faktureringsdata (betalningshistorik, faktureringsadress – vi lagrar inga kortuppgifter).',
                },
                {
                    heading: '3. Ändamål och rättslig grund',
                    content: 'Avtal: Vi behandlar uppgifter för att tillhandahålla tjänsten du beställt, hantera ditt konto, skicka transaktionsmail och fakturera. Rättslig förpliktelse: Vi sparar bokföringsunderlag enligt bokföringslagen (7 år) och uppfyller krav från Skatteverket. Berättigat intresse: Vi analyserar aggregerad användningsdata för att förbättra tjänsten, skickar relevanta produktuppdateringar och förebygger bedrägerier. Samtycke: Marknadsföringsutskick kräver ditt aktiva samtycke och du kan när som helst avregistrera dig.',
                },
                {
                    heading: '4. Lagringstid',
                    content: 'Kontouppgifter sparas så länge kontot är aktivt plus 30 dagar efter avslut för att möjliggöra återaktivering. Bokföringsmaterial sparas i 7 år enligt lag. Aktivitetsloggar sparas i 12 månader. Supportärenden sparas i 24 månader. Efter dessa perioder raderas eller anonymiseras uppgifterna.',
                },
                {
                    heading: '5. Mottagare av uppgifter',
                    content: 'Vi delar uppgifter med: Stripe (betalningshantering, egen integritetspolicy gäller). Fortnox (om du använder integrationen – endast de uppgifter du väljer att synka). AWS (hosting, data lagras inom EU). Resend (transaktionsmail). 46elks (SMS-tjänster, om aktiverat). Våra underleverantörer är bundna av personuppgiftsbiträdesavtal och får inte använda uppgifterna för egna ändamål.',
                },
                {
                    heading: '6. Överföring till tredje land',
                    content: 'Vår primära datalagring sker inom EU (AWS Frankfurt). Om data undantagsvis överförs till USA sker det med stöd av EU-kommissionens beslut om adekvat skyddsnivå (Data Privacy Framework) eller standardavtalsklausuler.',
                },
                {
                    heading: '7. Säkerhetsåtgärder',
                    content: 'Vi skyddar dina uppgifter genom: Kryptering av data i vila (AES-256) och under överföring (TLS 1.3). Tvåfaktorsautentisering för administratörer. Regelbundna säkerhetstester och penetrationstester. Åtkomstloggning och behörighetskontroll. Dagliga säkerhetskopior med geografisk redundans.',
                },
                {
                    heading: '8. Dina rättigheter',
                    content: 'Tillgång: Begär en kopia av dina personuppgifter via kontoinställningarna eller genom att kontakta oss. Rättelse: Korrigera felaktiga uppgifter direkt i tjänsten eller meddela oss. Radering: Begär radering av uppgifter som inte längre behövs – undantaget bokföringsmaterial. Begränsning: Be oss pausa behandlingen under utredning av invändning. Dataportabilitet: Exportera din data i JSON- eller CSV-format direkt från tjänsten. Invändning: Motsätt dig behandling baserad på berättigat intresse. Återkalla samtycke: Avregistrera dig från marknadsföringsutskick via länk i mailet eller i kontoinställningar.',
                },
                {
                    heading: '9. Cookies',
                    content: 'Vi använder nödvändiga cookies för autentisering och sessionhantering. Analytiska cookies (endast med samtycke) hjälper oss förstå hur tjänsten används. Du kan hantera cookieinställningar i din webbläsare eller via vår cookie-banner.',
                },
                {
                    heading: '10. Ändringar i policyn',
                    content: 'Vi kan uppdatera denna policy vid behov. Väsentliga ändringar meddelas via e-post minst 30 dagar i förväg. Fortsatt användning efter meddelande innebär godkännande av ändringarna.',
                },
                {
                    heading: '11. Klagomål',
                    content: 'Om du anser att vi hanterar dina uppgifter felaktigt, kontakta först oss på privacy@momentum-crm.se. Du har även rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY), imy.se.',
                },
            ],
        },
        terms: {
            title: 'Användarvillkor',
            lastUpdated: 'Senast uppdaterad: 20 januari 2026',
            sections: [
                {
                    heading: '1. Parter och omfattning',
                    content: 'Dessa villkor gäller mellan Momentum CRM AB, org.nr 559XXX-XXXX ("Momentum") och den organisation eller person som registrerar ett konto ("Kunden"). Villkoren reglerar användningen av Momentum-plattformen för kundrelationshantering, offertering, fakturering och tillhörande funktioner.',
                },
                {
                    heading: '2. Registrering och konto',
                    content: 'Kunden garanterar att angiven information är korrekt. Varje användare ska ha ett personligt konto – delning av inloggningsuppgifter är inte tillåtet. Kontoadministratören ansvarar för att hantera användarbehörigheter inom organisationen. Vi förbehåller oss rätten att neka registrering utan att ange skäl.',
                },
                {
                    heading: '3. Tjänstens tillhandahållande',
                    content: 'Vi tillhandahåller tjänsten som en molnbaserad SaaS-lösning. Planerat underhåll aviseras minst 48 timmar i förväg via e-post eller i gränssnittet. Vårt tillgänglighetsmål är 99,5% månatlig drifttid (exklusive planerat underhåll). Vid driftstörningar publiceras statusuppdateringar på status.momentum-crm.se.',
                },
                {
                    heading: '4. Acceptabel användning',
                    content: 'Tjänsten får användas för legitima affärsändamål. Du får inte: Använda tjänsten för att skicka oönskade massutskick (spam). Försöka få obehörig åtkomst till andra kunders data. Reverse-engineera, kopiera eller vidaresälja tjänsten. Ladda upp skadlig kod eller material som kränker tredje parts rättigheter. Överskrida rimliga användningsvolymer som påverkar andra kunders upplevelse.',
                },
                {
                    heading: '5. Kunddata och äganderätt',
                    content: 'All data du lägger in i tjänsten tillhör dig. Vi gör inte anspråk på äganderätt till kunddata. Du ger oss licens att behandla data i den utsträckning som krävs för att tillhandahålla tjänsten. Vid kontots avslut kan du exportera din data under 30 dagar innan den raderas permanent.',
                },
                {
                    heading: '6. Pris och betalning',
                    content: 'Priser anges exklusive moms om inget annat framgår. Månadsplaner faktureras i förskott. Årsplaner betalas för hela perioden vid beställning. Prisändringar aviseras minst 30 dagar i förväg och gäller från nästa faktureringsperiod. Vid utebliven betalning skickar vi påminnelse efter 10 dagar och kan begränsa åtkomsten efter 30 dagar.',
                },
                {
                    heading: '7. Uppsägning',
                    content: 'Du kan säga upp ditt abonnemang när som helst via kontoinställningarna. Uppsägningen träder i kraft vid innevarande periods slut – ingen återbetalning sker för oanvänd tid. Vi kan säga upp avtalet omedelbart vid väsentligt avtalsbrott. Vid uppsägning behåller du tillgång till läsläge i 30 dagar för dataexport.',
                },
                {
                    heading: '8. Ansvarsbegränsning',
                    content: 'Momentums totala skadeståndsansvar är begränsat till de avgifter Kunden betalat under de senaste 12 månaderna. Vi ansvarar inte för indirekta skador, utebliven vinst, dataförlust orsakad av kundens handlingar, eller driftstopp hos tredje part (Fortnox, betalningsleverantörer). Kunden ansvarar för att uppfylla bokföringslagens krav och att verifiera fakturadata innan den synkas till externa system.',
                },
                {
                    heading: '9. Immaterialrätt',
                    content: 'Momentum äger alla rättigheter till plattformen, inklusive källkod, design, varumärken och dokumentation. Kunden erhåller en icke-exklusiv, icke-överförbar rätt att använda tjänsten under avtalstiden. Feedback och förslag du lämnar kan vi fritt använda för att förbättra tjänsten.',
                },
                {
                    heading: '10. Sekretess',
                    content: 'Vi behandlar Kundens affärsinformation konfidentiellt och lämnar inte ut den till tredje part, förutom till underleverantörer som är nödvändiga för tjänstens tillhandahållande och som är bundna av sekretessavtal.',
                },
                {
                    heading: '11. Force majeure',
                    content: 'Ingen part ansvarar för förseningar eller utebliven prestation orsakad av omständigheter utanför rimlig kontroll, såsom naturkatastrofer, krig, pandemi, strejk, myndighetsåtgärder eller avbrott i internet-infrastruktur.',
                },
                {
                    heading: '12. Ändringar i villkoren',
                    content: 'Vi kan uppdatera dessa villkor. Väsentliga ändringar meddelas via e-post minst 30 dagar före ikraftträdande. Fortsatt användning efter ändringstidpunkten innebär godkännande. Tidigare versioner arkiveras och finns tillgängliga på begäran.',
                },
                {
                    heading: '13. Tillämplig lag och tvist',
                    content: 'Svensk lag tillämpas, utan hänsyn till lagvalsregler. Tvister ska i första hand lösas genom förhandling. Om enighet inte nås inom 30 dagar avgörs tvisten av svensk allmän domstol med Stockholms tingsrätt som första instans.',
                },
                {
                    heading: '14. Kontakt',
                    content: 'Frågor om dessa villkor besvaras av Momentum CRM AB, Birger Jarlsgatan 57, 113 56 Stockholm. E-post: juridik@momentum-crm.se. Telefon: +46 8 123 45 67 (vardagar 09–17).',
                },
            ],
        },
    },
};

export type ContentType = typeof sv;
export default sv;
