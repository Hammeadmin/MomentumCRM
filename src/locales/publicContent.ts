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
            lastUpdated: 'Senast uppdaterad: 8 januari 2026',
            sections: [
                {
                    heading: '1. Inledning',
                    content: 'Momentum CRM AB ("vi", "oss", "vår") värnar om din integritet. Denna policy beskriver hur vi samlar in, använder och skyddar dina personuppgifter i enlighet med EU:s dataskyddsförordning (GDPR).',
                },
                {
                    heading: '2. Vilka uppgifter vi samlar in',
                    content: 'Vi samlar in uppgifter som du lämnar när du registrerar dig, såsom namn, e-postadress och företagsinformation. Vi samlar även in teknisk data som IP-adresser och cookies för att förbättra vår tjänst.',
                },
                {
                    heading: '3. Hur vi använder dina uppgifter',
                    content: 'Dina uppgifter används för att tillhandahålla och förbättra våra tjänster, kommunicera med dig om ditt konto, och uppfylla våra juridiska skyldigheter.',
                },
                {
                    heading: '4. Delning av uppgifter',
                    content: 'Vi delar inte dina personuppgifter med tredje part förutom när det krävs för att leverera tjänsten (t.ex. betaltjänster) eller när lagen kräver det.',
                },
                {
                    heading: '5. Dina rättigheter',
                    content: 'Du har rätt att begära tillgång till, rättelse av, eller radering av dina personuppgifter. Du kan även motsätta dig viss behandling eller begära dataportabilitet.',
                },
                {
                    heading: '6. Kontakt',
                    content: 'Vid frågor om denna policy, kontakta oss på privacy@momentum-crm.se eller via post till Momentum CRM AB, Birger Jarlsgatan 57, 113 56 Stockholm.',
                },
            ],
        },
        terms: {
            title: 'Användarvillkor',
            lastUpdated: 'Senast uppdaterad: 8 januari 2026',
            sections: [
                {
                    heading: '1. Acceptans av villkor',
                    content: 'Genom att använda Momentum CRM godkänner du dessa användarvillkor. Om du inte accepterar villkoren, vänligen avstå från att använda tjänsten.',
                },
                {
                    heading: '2. Tjänstebeskrivning',
                    content: 'Momentum CRM är en SaaS-plattform för kundrelationshantering, offerthantering, fakturering och projektledning. Tjänsten tillhandahålls "som den är".',
                },
                {
                    heading: '3. Användarkonton',
                    content: 'Du är ansvarig för att skydda dina inloggningsuppgifter och för all aktivitet som sker under ditt konto. Meddela oss omedelbart vid misstänkt obehörig åtkomst.',
                },
                {
                    heading: '4. Betalning och fakturering',
                    content: 'Avgifter faktureras i förskott. Vid utebliven betalning kan vi begränsa eller avsluta din åtkomst till tjänsten.',
                },
                {
                    heading: '5. Uppsägning',
                    content: 'Du kan säga upp ditt konto när som helst. Vi kan säga upp eller suspendera din åtkomst vid brott mot dessa villkor.',
                },
                {
                    heading: '6. Ansvarsbegränsning',
                    content: 'Momentum CRM ansvarar inte för indirekta skador eller förluster som uppstår genom användning av tjänsten.',
                },
            ],
        },
    },
};

export type ContentType = typeof sv;
export default sv;
