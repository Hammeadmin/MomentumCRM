/**
 * Swedish Localization Strings (sv-SE)
 * Centralized string management for the application
 */

// =============================================================================
// GREETINGS
// =============================================================================

export const GREETINGS = {
    MORNING: 'God morgon',
    DAY: 'God dag',
    EVENING: 'God kväll',
} as const;

/**
 * Get appropriate Swedish greeting based on hour
 */
export const getGreeting = (hour: number): string => {
    if (hour < 10) return GREETINGS.MORNING;
    if (hour < 17) return GREETINGS.DAY;
    if (hour > 20) return GREETINGS.EVENING;
    return GREETINGS.DAY;
};

// =============================================================================
// NAVIGATION
// =============================================================================

export const NAV = {
    DASHBOARD: 'Dashboard',
    SALES_TUNNEL: 'Säljtunnel',
    ORDERS: 'Orderhantering',
    CUSTOMERS: 'Kunder',
    QUOTES: 'Offerter',
    LEADS: 'Förfrågningar',
    CALENDAR: 'Kalender',
    INVOICES: 'Fakturor',
    COMMUNICATION: 'Kommunikation',
    TEAM: 'Team',
    PAYROLL: 'Lönehantering',
    DOCUMENTS: 'Dokument',
    REPORTS: 'Rapporter',
    INTRANET: 'Intranät',
    ANALYTICS: 'Analys',
    SETTINGS: 'Inställningar',
} as const;

// =============================================================================
// KPI LABELS
// =============================================================================

export const KPI = {
    TOTAL_SALES: 'Total Försäljning',
    TOTAL_SALES_DESC: 'Summa av betalda fakturor',
    ACTIVE_LEADS: 'Aktiva Leads',
    ACTIVE_LEADS_DESC: 'Leads som inte är vunna/förlorade',
    ACTIVE_JOBS: 'Pågående Jobb',
    ACTIVE_JOBS_DESC: 'Jobb som pågår',
    OVERDUE_INVOICES: 'Förfallna Fakturor',
    OVERDUE_INVOICES_DESC: 'Fakturor som är förfallna',
    VS_LAST_MONTH: 'vs förra månaden',
} as const;

// =============================================================================
// USER ROLES
// =============================================================================

export const USER_ROLES = {
    ADMIN: 'Administratör',
    SALES: 'Säljare',
    WORKER: 'Medarbetare',
    FINANCE: 'Ekonomiansvarig',
} as const;

/**
 * Get Swedish label for user role
 */
export const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
        admin: USER_ROLES.ADMIN,
        sales: USER_ROLES.SALES,
        worker: USER_ROLES.WORKER,
        finance: USER_ROLES.FINANCE,
    };
    return roleMap[role] || role;
};

// =============================================================================
// DASHBOARD LABELS
// =============================================================================

export const DASHBOARD = {
    TITLE: 'Dashboard',
    SUBTITLE: 'Översikt av din verksamhet',
    RECENT_ACTIVITY: 'Senaste Aktiviteter',
    JOB_STATUS: 'Jobbstatus',
    LEADS_BY_STATUS: 'Leads per Status',
    SALES_OVERVIEW: 'Försäljningsöversikt',
    QUICK_ACTIONS: 'Snabbåtgärder',
    REFRESH: 'Uppdatera',
    LOADING_ERROR: 'Kunde inte ladda dashboard-data.',
    NO_ACTIVITY: 'Ingen aktivitet att visa',
} as const;

// =============================================================================
// COMMON ACTIONS
// =============================================================================

export const ACTIONS = {
    SAVE: 'Spara',
    CANCEL: 'Avbryt',
    DELETE: 'Ta bort',
    EDIT: 'Redigera',
    CREATE: 'Skapa',
    CLOSE: 'Stäng',
    VIEW: 'Visa',
    SEARCH: 'Sök',
    FILTER: 'Filtrera',
    EXPORT: 'Exportera',
} as const;

// =============================================================================
// SIDEBAR LABELS
// =============================================================================

export const SIDEBAR = {
    EXPAND: 'Expandera sidebar',
    COLLAPSE: 'Kollaps sidebar',
    LOGOUT: 'Logga ut',
    PROFILE: 'Profil',
    ALL_DOCUMENTS: 'Alla dokument',
} as const;

// =============================================================================
// SIMPLE TRANSLATION HOOK
// =============================================================================

/**
 * Simple translation function
 * Can be replaced with i18next or similar in the future
 */
export const t = <T extends Record<string, string>>(
    translations: T,
    key: keyof T
): string => {
    return translations[key] || String(key);
};

// =============================================================================
// KANBAN LABELS
// =============================================================================

export const KANBAN = {
    TITLE: 'Säljtunnel',
    SUBTITLE: (orders: number, leads: number, quotes: number) => `${orders} ordrar • ${leads} förfrågningar • ${quotes} offerter`,
    ADD_ORDER: 'Lägg till Order',
    SEARCH_PLACEHOLDER: 'Sök ordrar...',
    ASSIGNED_TO: 'Tilldelad till',
    CUSTOMER: 'Kund',
    ALL: 'Alla',
    UNASSIGNED: 'Ej tilldelad',
    ALL_CUSTOMERS: 'Alla kunder',
    CLEAR_FILTERS: 'Rensa filter',
    NO_ITEMS: 'Inga ärenden i denna status',
    LOADING: 'Laddar...',
    LOADING_DATA: 'Laddar ordrar och leads...',
    ERROR_LOADING: 'Kunde inte ladda ordrar',
    TRY_AGAIN: 'Försök igen',
    COLUMNS: {
        INQUIRIES: 'Förfrågningar',
        QUOTES_DRAFT: 'Offert (utkast)',
        OPEN_ORDERS: 'Öppna Ordrar',
        BOOKED_ORDERS: 'Bokade Ordrar',
        NOT_COMPLETED: 'Ej Slutförda',
        READY_TO_INVOICE: 'Redo att Fakturera',
        CANCELLED: 'Avbokade',
    },
    CONFIRM: {
        OPEN_ORDER: 'Är du säker på att du vill ändra status till "Öppen Order"?',
        BOOKED: (title: string) => `Bekräfta att ordern "${title}" är bokad och bekräftad?`,
        CANCELLED: (title: string) => `Bekräfta att kunden har avbokat ordern "${title}"?`,
        NOT_COMPLETED: (title: string) => `Markera ordern "${title}" som ej slutförd?`,
        READY_TO_INVOICE: (title: string) => `Bekräfta att ordern "${title}" är redo att fakturera?`,
    },
    MESSAGES: {
        ERROR_TITLE: 'Fel',
        SUCCESS_TITLE: 'Framgång',
        MISSING_FIELDS: 'Titel, kund och jobbeskrivning är obligatoriska fält.',
        MISSING_INDIVIDUAL: 'Välj en person för individuell tilldelning.',
        MISSING_TEAM: 'Välj ett team för team-tilldelning.',
        ORDER_CREATED: 'Order skapad framgångsrikt!',
        ORDER_UPDATED: 'Order uppdaterad!',
        STATUS_UPDATED: 'Order-status uppdaterad!',
        ORDER_DELETED: 'Order borttagen framgångsrikt!',
        QUOTE_CREATED: 'Offert har skapats och ligger nu som utkast.',
        QUOTE_ACCEPTED: 'Offerten har accepterats och en order har skapats.',
        ERROR_CREATE: 'Ett oväntat fel inträffade vid skapande av order.',
        ERROR_UPDATE: 'Ett oväntat fel inträffade vid uppdatering av order.',
        ERROR_STATUS: 'Ett oväntat fel inträffade vid uppdatering av status.',
        ERROR_DELETE: 'Ett oväntat fel inträffade vid borttagning av order.',
        ERROR_QUOTE: 'Kunde inte skapa offert från lead.',
        ERROR_COMMS: 'Kunde inte ladda kommunikationshistorik.',
        ERROR_NOTE: 'Ett oväntat fel inträffade vid tillägg av anteckning.',
        MISSING_CUSTOMER_QUOTE: 'Förfrågan måste vara kopplad till en kund för att skapa en offert.',
        ERROR_ACCEPT_QUOTE: (msg: string) => `Kunde inte acceptera offerten: ${msg}`,
        ERROR_CREATE_QUOTE: (msg: string) => `Kunde inte skapa offert: ${msg}`,
    }
} as const;

export const FORMS = {
    TITLE: 'Titel',
    DESCRIPTION: 'Beskrivning',
    JOB_DESCRIPTION: 'Jobbeskrivning',
    CUSTOMER: 'Kund',
    SELECT_CUSTOMER: 'Välj kund...',
    GENERAL_DESCRIPTION: 'Allmän beskrivning',
    GENERAL_DESC_PLACEHOLDER: 'Allmän beskrivning av ordern...',
    JOB_DESC_PLACEHOLDER: 'Detaljerad beskrivning av det arbete som ska utföras...',
    JOB_TYPE: 'Jobbtyp',
    ESTIMATED_HOURS: 'Uppskattade timmar',
    COMPLEXITY: 'Komplexitet (1-5)',
    VALUE: 'Värde (SEK)',
    SOURCE: 'Källa',
    SOURCE_PLACEHOLDER: 'T.ex. Webbsida, Telefon, E-post...',
    ASSIGNMENT: 'Tilldelning',
    ASSIGNMENT_TYPE: 'Tilldelningstyp',
    ASSIGN_INDIVIDUAL: 'Tilldela individ',
    ASSIGN_TEAM: 'Tilldela team',
    ASSIGN_TO_PERSON: 'Tilldela till person',
    ASSIGN_TO_TEAM: 'Tilldela till team',
    SELECT_PERSON: 'Välj person...',
    SELECT_TEAM: 'Välj team...',
    INDIVIDUAL: 'Individ',
    TEAM: 'Team',
    CREATE_ORDER: 'Skapa Order',
    EDIT_ORDER: 'Redigera Order',
    ADD_NEW: 'Lägg till ny order',
    SAVE_CHANGES: 'Spara ändringar',
    CREATING: 'Skapar...',
    EDIT_LEAD: 'Redigera Förfrågan',
    EDIT_QUOTE: 'Redigera Offert',
    ORDER_INFO: 'Orderinformation',
    ROT_INFO: 'ROT Information',
    COMMISSION: 'Provision',
    PRIMARY_SALESPERSON: 'Primär säljare',
    NO_SALESPERSON: 'Ingen säljare tilldelad.',
    MANAGE_COMMISSION: 'Hantera Provision',
    NOT_SPECIFIED: 'Ej angivet',
    SHOWING_TEAMS: (specialty: string) => `Visar team med specialitet "${specialty}" eller "Allmänt"`,
} as const;

// =============================================================================
// LEADS LABELS
// =============================================================================

export const LEADS = {
    TITLE: 'Förfrågningar',
    SUBTITLE: (active: number, won: number) => `${active} aktiva leads • ${won} vunna`,
    STATUS: {
        NEW: 'Ny',
        CONTACTED: 'Kontaktad',
        QUALIFIED: 'Kvalificerad',
        PROPOSAL: 'Offert',
        WON: 'Vunnen',
        LOST: 'Förlorad',
    },
    ANALYTICS: {
        TOTAL_LEADS: 'Totala Leads',
        CONVERSION_RATE: 'Konvertering',
        AVG_DEAL_SIZE: 'Snitt Affärsvärde',
        SALES_CYCLE: 'Säljcykel',
        DAYS: 'dagar',
    },
    FILTERS: {
        SEARCH_PLACEHOLDER: 'Sök på titel...',
        ALL_STATUSES: 'Alla Statusar',
        ALL_SOURCES: 'Alla Källor',
        ALL_SALESPEOPLE: 'Alla Säljare',
        UNASSIGNED: 'Otilldelade',
        RESET: 'Återställ',
    },
    FORM: {
        CREATE_TITLE: 'Skapa Ny Förfrågan',
        EDIT_TITLE: 'Redigera Lead',
        TITLE_LABEL: 'Titel',
        TITLE_PLACEHOLDER: 'T.ex. Takrengöring villa...',
        DESCRIPTION_LABEL: 'Beskrivning',
        DESCRIPTION_PLACEHOLDER: 'Ange så mycket detaljer som möjligt...',
        SOURCE_LABEL: 'Källa',
        SOURCE_PLACEHOLDER: 'T.ex. Hemsidan, Rekommendation...',
        VALUE_LABEL: 'Uppskattat Värde (SEK)',
        CUSTOMER_LABEL: 'Befintlig Kund',
        CUSTOMER_PLACEHOLDER: 'Välj kund (om befintlig)...',
        SALESPERSON_LABEL: 'Tilldela till Säljare',
        SALESPERSON_PLACEHOLDER: 'Välj säljare...',
        SAVE_BUTTON: 'Spara Ändringar',
        CREATE_BUTTON: 'Skapa Lead',
    },
    ACTIONS: {
        CREATE: 'Skapa Förfrågan',
        FILTER: 'Filter',
        LIST_VIEW: 'Listvy',
        PIPELINE_VIEW: 'Pipelinevy',
        CALL: 'Ring',
        EMAIL: 'E-post',
        BOOK_MEETING: 'Boka möte',
        CREATE_QUOTE: 'Skapa offert',
        SET_REMINDER: 'Sätt påminnelse',
    },
    KANBAN: {
        DRAG_HERE: 'Dra leads hit',
    },
    DETAILS: {
        DESCRIPTION: 'Beskrivning',
        NO_DESCRIPTION: 'Ingen beskrivning.',
        SOURCE: 'Källa',
        UNKNOWN_SOURCE: 'Okänd',
        ESTIMATED_VALUE: 'Uppskattat värde',
        NOT_SPECIFIED: 'Ej angivet',
        LAST_ACTIVITY: 'Senaste aktivitet',
        AI_ASSISTANT: 'AI-Assistent: Nästa Steg',
        NO_SUGGESTIONS: 'Inga specifika förslag just nu.',
        RECOMMENDED: 'Rekommenderat',
        SELECT_LEAD: 'Välj ett lead',
        SELECT_LEAD_DESC: 'Välj ett lead från listan till vänster för att se detaljer och AI-förslag.',
    },
    SIDEBAR: {
        RSS_TITLE: 'Nya Affärsmöjligheter',
        RSS_EMPTY: 'Inga artiklar tillgängliga.',
        RSS_CREATE_LEAD: 'Skapa lead av detta',
        TASKS_TITLE: 'Mina Uppgifter',
        TASKS_EMPTY: 'Inga aktiva uppgifter. Bra jobbat!',
    },
    MESSAGES: {
        ERROR_TITLE: 'Fel',
        SUCCESS_TITLE: 'Framgång',
        MUST_LOGIN: 'Du måste vara inloggad.',
        LEAD_CREATED: 'Lead har skapats!',
        LEAD_UPDATED: 'Lead har uppdaterats!',
        LEAD_DELETED: 'Lead har tagits bort.',
        ERROR_SAVE: (msg: string) => `Kunde inte spara lead: ${msg}`,
        ERROR_LOAD: 'Kunde inte ladda leads.',
        ERROR_TASKS: 'Kunde inte ladda säljuppgifter.',
        ERROR_RSS: 'Kunde inte ladda RSS-flöde.',
        ERROR_AI: 'Kunde inte hämta AI-förslag.',
        ERROR_DELETE: 'Kunde inte ta bort lead.',
        ERROR_STATUS: 'Kunde inte uppdatera status.',
        ERROR_ARTICLE: 'Kunde inte skapa lead från artikel.',
        ERROR_TASK: 'Kunde inte uppdatera uppgiften.',
        ARTICLE_SUCCESS: 'Nytt lead har skapats från artikeln!',
    },
    CONFIRM: {
        DELETE_TITLE: 'Ta bort Lead',
        DELETE_MESSAGE: (title: string) => `Är du säker på att du vill ta bort "${title}"?`,
    },
} as const;

// =============================================================================
// INVOICES LABELS
// =============================================================================

export const INVOICES = {
    TITLE: 'Fakturor',
    SUBTITLE: (count: number, readyCount: number) => `${count} fakturor • ${readyCount} ordrar redo`,
    LOADING: 'Laddar...',
    LOADING_DESC: 'Laddar faktureringsinformation...',
    ERROR_LOADING: 'Kunde inte ladda fakturor',
    TRY_AGAIN: 'Försök igen',
    CREATE_INVOICE: 'Skapa Faktura',
    TABS: {
        ALL_INVOICES: 'Alla Fakturor',
        MANAGE_INVOICES: 'Hantera Fakturor',
        CREDIT_NOTES: 'Kreditfakturor',
    },
    TABLE: {
        INVOICE_NUMBER: 'Fakturanummer',
        CUSTOMER: 'Kund',
        AMOUNT: 'Belopp',
        STATUS: 'Status',
        DUE_DATE: 'Förfallodatum',
        CREATED: 'Skapad',
        ACTIONS: 'Åtgärder',
        SELECT_ALL: 'Välj alla',
        SELECTED: (count: number) => `${count} fakturor valda`,
        DOWNLOAD_PDF: (count: number) => `Ladda ner ${count} PDF`,
        UNKNOWN_CUSTOMER: 'Okänd kund',
        CREDITED: 'Krediterat',
        NET: 'Netto',
    },
    ORDERS: {
        TITLE: 'Ordrar redo att fakturera',
        DESCRIPTION: 'Ordrar med status "Redo att fakturera" som kan konverteras till fakturor',
        EMPTY_TITLE: 'Inga ordrar redo att fakturera',
        EMPTY_DESCRIPTION: 'Ordrar med status "Redo att fakturera" kommer att visas här.',
        ORDER_TITLE: 'Order Titel',
        VALUE: 'Värde',
        ASSIGNMENT: 'Tilldelning',
        DATE_COMPLETED: 'Datum Slutfört',
        NOT_ASSIGNED: 'Ej tilldelad',
        CREATE_INVOICES: (count: number) => `Skapa ${count} Fakturor`,
    },
    FORM: {
        CREATE_TITLE: 'Skapa Faktura',
        EDIT_TITLE: 'Redigera Faktura',
        CUSTOMER: 'Kund',
        SELECT_CUSTOMER: 'Välj kund...',
        MANUAL_CUSTOMER: 'Lägg till manuell kund',
        LINE_ITEMS: 'Fakturarader',
        ADD_LINE: 'Lägg till rad',
        ADD_SAVED_ITEM: 'Lägg till sparad rad',
        SELECT_SAVED_ITEM: 'Välj sparad rad...',
        SAVE_LINE_ITEM: 'Spara rad för framtida bruk',
        DESCRIPTION: 'Beskrivning',
        QUANTITY: 'Antal',
        UNIT_PRICE: 'À-pris',
        TOTAL: 'Summa',
        SUBTOTAL: 'Delsumma',
        VAT: 'Moms (25%)',
        GRAND_TOTAL: 'Totalt',
        DUE_DATE: 'Förfallodatum',
        WORK_SUMMARY: 'Arbetsbeskrivning',
    },
    MESSAGES: {
        ERROR_TITLE: 'Fel',
        SUCCESS_TITLE: 'Framgång',
        CREATED: 'Faktura skapad framgångsrikt!',
        UPDATED: 'Faktura uppdaterad!',
        DELETED: 'Faktura borttagen framgångsrikt!',
        MARKED_PAID: (number: string) => `Faktura ${number} har markerats som betald.`,
        ASSIGNMENT_UPDATED: 'Tilldelning har uppdaterats.',
        EMAIL_SENT: (email: string) => `E-post skickad till ${email}!`,
        FILE_UPLOADED: 'Signerad faktura uppladdad och sparad!',
        LINE_ITEM_SAVED: (name: string) => `"${name}" har sparats för framtida bruk.`,
        BULK_CREATED: (count: number) => `${count} fakturor skapade framgångsrikt!`,
        BULK_FAILED: (count: number) => `${count} fakturor kunde inte skapas.`,
        ERROR_CREATE: 'Ett oväntat fel inträffade vid skapande av faktura.',
        ERROR_UPDATE: 'Kunde inte uppdatera fakturan.',
        ERROR_DELETE: 'Ett oväntat fel inträffade vid borttagning av faktura.',
        ERROR_MARK_PAID: (msg: string) => `Kunde inte uppdatera fakturan: ${msg}`,
        ERROR_SEND_EMAIL: 'Ett oväntat fel inträffade vid skickande av e-post.',
        ERROR_UPLOAD: 'Kunde inte ladda upp filen.',
        ERROR_SAVE_LINE_ITEM: 'Kunde inte spara raden.',
        MISSING_CUSTOMER: 'Kund (eller namn för manuell kund) är obligatoriskt.',
        MISSING_LINE_ITEM: 'Minst en fakturarad med beskrivning är obligatoriskt.',
        MISSING_EMAIL_FIELDS: 'Alla e-postfält måste fyllas i.',
        MISSING_ORDER_CUSTOMER: 'Order saknar kundinformation.',
        DUPLICATE_LINE_ITEM: 'En rad med detta namn finns redan sparad.',
        LINE_ITEM_VALIDATION: 'Beskrivning och ett pris större än noll krävs för att spara en rad.',
        CONFIRM_MARK_PAID: 'Är du säker på att du vill markera denna faktura som betald?',
        CONFIRM_BULK_CREATE: (count: number) => `Är du säker på att du vill skapa ${count} fakturor?`,
    },
    EMPTY: {
        TITLE: 'Inga fakturor ännu',
        DESCRIPTION: 'Skapa din första faktura eller generera fakturor från färdiga ordrar.',
        ACTION: 'Skapa Faktura',
    },
    FILTERS: {
        SEARCH: 'Sök',
        SEARCH_PLACEHOLDER: 'Sök fakturor...',
        STATUS: 'Status',
        ALL_STATUSES: 'Alla statusar',
        CUSTOMER: 'Kund',
        ALL_CUSTOMERS: 'Alla kunder',
        CLEAR: 'Rensa filter',
    },
} as const;

export const TABS = {
    DETAILS: 'Detaljer & Anteckningar',
    COMMUNICATION: 'Kommunikation',
    HISTORY: 'Historik',
    NOTES: 'Anteckningar',
} as const;

/**
 * Use translation hook (for React components)
 */
export const useTranslation = () => {
    return {
        t,
        locale: 'sv-SE',
        greetings: GREETINGS,
        nav: NAV,
        kpi: KPI,
        dashboard: DASHBOARD,
        actions: ACTIONS,
        sidebar: SIDEBAR,
        kanban: KANBAN,
        forms: FORMS,
        tabs: TABS,
        leads: LEADS,
        invoices: INVOICES,
        getRoleLabel,
        getGreeting,
    };
};

