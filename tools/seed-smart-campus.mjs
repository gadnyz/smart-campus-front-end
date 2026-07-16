#!/usr/bin/env node

const DEFAULT_API_BASE_URL = 'http://localhost:8085';
const DEFAULT_API_USERNAME = 'admin@smart-campus.org';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const skipOpenApi = args.has('--skip-openapi');
const printEndpoints = args.has('--print-endpoints');
const showHelp = args.has('--help') || args.has('-h');

if (showHelp) {
    console.log(`
Seed Smart Campus data through the REST API.

Usage:
  $env:SMARTCAMPUS_API_PASSWORD = 'admin@password'
  npm run seed:api

Options:
  --check            Verify OpenAPI, login, and list endpoints without creating data.
  --skip-openapi     Skip /v3/api-docs verification.
  --print-endpoints  Print all operations loaded from OpenAPI.

Environment:
  SMARTCAMPUS_API_URL       Defaults to ${DEFAULT_API_BASE_URL}
  SMARTCAMPUS_API_USERNAME  Defaults to ${DEFAULT_API_USERNAME}
  SMARTCAMPUS_API_PASSWORD  Required
`);
    process.exit(0);
}

const config = {
    baseUrl: trimTrailingSlash(process.env.SMARTCAMPUS_API_URL || DEFAULT_API_BASE_URL),
    username: process.env.SMARTCAMPUS_API_USERNAME || DEFAULT_API_USERNAME,
    password: process.env.SMARTCAMPUS_API_PASSWORD
};

if (!config.password) {
    console.error("Missing SMARTCAMPUS_API_PASSWORD. Example: $env:SMARTCAMPUS_API_PASSWORD = 'admin@password'");
    process.exit(1);
}

const requiredSeedEndpoints = [
    ['post', '/api/v1/auth/login'],
    ['get', '/api/v1/faculties'],
    ['post', '/api/v1/faculties'],
    ['get', '/api/v1/levels'],
    ['post', '/api/v1/levels'],
    ['get', '/api/v1/programs'],
    ['post', '/api/v1/programs'],
    ['get', '/api/v1/academic-years'],
    ['post', '/api/v1/academic-years'],
    ['patch', '/api/v1/academic-years/{academicYearId}/activate'],
    ['get', '/api/v1/semesters'],
    ['post', '/api/v1/semesters'],
    ['get', '/api/v1/course-units/faculty/{facultyId}'],
    ['post', '/api/v1/course-units'],
    ['get', '/api/v1/courses'],
    ['post', '/api/v1/courses'],
    ['get', '/api/v1/professor-grades'],
    ['post', '/api/v1/professor-grades'],
    ['get', '/api/v1/professors'],
    ['post', '/api/v1/professors'],
    ['post', '/api/v1/course-assignments'],
    ['get', '/api/v1/rooms'],
    ['post', '/api/v1/rooms'],
    ['get', '/api/v1/timetables'],
    ['post', '/api/v1/timetables'],
    ['post', '/api/v1/timetable-entries'],
    ['get', '/api/v1/privileges'],
    ['post', '/api/v1/privileges'],
    ['get', '/api/v1/roles'],
    ['post', '/api/v1/roles'],
    ['post', '/api/v1/roles/{roleId}/privileges'],
    ['get', '/api/v1/profiles'],
    ['post', '/api/v1/profiles'],
    ['post', '/api/v1/profiles/{profileId}/roles'],
    ['get', '/api/v1/users'],
    ['post', '/api/v1/auth/register'],
    ['get', '/api/v1/candidates'],
    ['post', '/api/v1/candidates'],
    ['post', '/api/v1/candidates/{id}/validate']
];

const commonLevelCodes = ['L1', 'L2', 'L3', 'M1', 'M2'];
const preparatoryLevelCodes = ['PREP', ...commonLevelCodes];
const computerScienceLevelCodes = ['L1', 'L2', 'L3', 'L4', 'M1', 'M2'];

const seedCatalog = {
    academicYear: {
        label: '2026-2027',
        start_date: '2026-09-01',
        end_date: '2027-08-31'
    },
    semesters: [
        {
            code: 'S1-2026',
            name: 'Semestre 1 2026-2027',
            semester_order: 1,
            start_date: '2026-09-01',
            end_date: '2027-01-31'
        },
        {
            code: 'S2-2027',
            name: 'Semestre 2 2026-2027',
            semester_order: 2,
            start_date: '2027-02-01',
            end_date: '2027-08-31'
        }
    ],
    faculties: [
        { code: 'MED', name: 'Facult\u00e9 de M\u00e9decine' },
        { code: 'SIC', name: 'SIC-Multim\u00e9dia' },
        { code: 'ST', name: 'Sciences Technologiques' },
        { code: 'SAE', name: 'Facult\u00e9 des Sciences des Aliments et de l\u2019Environnement' },
        { code: 'DRT', name: 'Facult\u00e9 de Droit' },
        { code: 'FST', name: 'Facult\u00e9 des Sciences Informatiques' },
        { code: 'GST', name: 'Facult\u00e9 des Sciences de Gestion' },
        { code: 'ARCHI', name: '\u00c9cole Sup\u00e9rieure d\u2019Architecture et d\u2019Urbanisme' }
    ],
    levels: [
        { code: 'PREP', name: 'Pr\u00e9paratoire', order: 1 },
        { code: 'L1', name: 'Licence 1', order: 1 },
        { code: 'L2', name: 'Licence 2', order: 2 },
        { code: 'L3', name: 'Licence 3', order: 3 },
        { code: 'L4', name: 'Licence 4', order: 3 },
        { code: 'M1', name: 'Master 1', order: 4 },
        { code: 'M2', name: 'Master 2', order: 5 }
    ],
    programs: [
        {
            code: 'MED',
            name: 'M\u00e9decine G\u00e9n\u00e9rale',
            facultyCode: 'MED',
            levelCodes: commonLevelCodes
        },
        {
            code: 'SIC',
            name: 'SIC-Multim\u00e9dia',
            facultyCode: 'SIC',
            levelCodes: commonLevelCodes
        },
        {
            code: 'ST-GC',
            name: 'G\u00e9nie Civil',
            facultyCode: 'ST',
            levelCodes: preparatoryLevelCodes
        },
        {
            code: 'ST-GE',
            name: 'G\u00e9nie \u00c9lectrique',
            facultyCode: 'ST',
            levelCodes: preparatoryLevelCodes
        },
        {
            code: 'SAE-ENV',
            name: 'Sciences de l\u2019Environnement',
            facultyCode: 'SAE',
            levelCodes: commonLevelCodes
        },
        {
            code: 'SAE-ALIM',
            name: 'Sciences des Aliments',
            facultyCode: 'SAE',
            levelCodes: commonLevelCodes
        },
        {
            code: 'DRT-LIC',
            name: 'Droit',
            facultyCode: 'DRT',
            levelCodes: ['L1', 'L2', 'L3']
        },
        {
            code: 'DRT-MDEA',
            name: 'Master droit \u00e9conomique et des affaires',
            facultyCode: 'DRT',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'DRT-MDM',
            name: 'Master Droit minier et gouvernance des ressources naturelles',
            facultyCode: 'DRT',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'DRT-MDPI',
            name: 'Master Droit public Interne',
            facultyCode: 'DRT',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'FST-GL',
            name: 'G\u00e9nie Logiciel',
            facultyCode: 'FST',
            levelCodes: computerScienceLevelCodes
        },
        {
            code: 'FST-SI',
            name: 'Syst\u00e8mes Informatiques',
            facultyCode: 'FST',
            levelCodes: computerScienceLevelCodes
        },
        {
            code: 'FST-IA',
            name: 'Intelligence Artificielle',
            facultyCode: 'FST',
            levelCodes: computerScienceLevelCodes
        },
        {
            code: 'GST-GBMA',
            name: 'Gestion Bancaire, Microfinance et Assurance',
            facultyCode: 'GST',
            levelCodes: ['L1', 'L2', 'L3']
        },
        {
            code: 'GST-GRH-LIC',
            name: 'Gestion des Ressources Humaines',
            facultyCode: 'GST',
            levelCodes: ['L1', 'L2', 'L3']
        },
        {
            code: 'GST-GE',
            name: 'Gestion des Entreprises',
            facultyCode: 'GST',
            levelCodes: ['L1', 'L2', 'L3']
        },
        {
            code: 'GST-GMC',
            name: 'Gestion Marketing et Commerciale',
            facultyCode: 'GST',
            levelCodes: ['L1', 'L2', 'L3']
        },
        {
            code: 'GST-MMO',
            name: 'Master en Management des Organisations',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'GST-MGM',
            name: 'Master en Gestion Marketing',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'GST-MGRH',
            name: 'Master en Gestion des Ressources Humaines',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'GST-MLT',
            name: 'Master en Logistique et Transport',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'GST-MFB',
            name: 'Master en Finance et Banque',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'GST-MGF',
            name: 'Master en Gestion Financi\u00e8re',
            facultyCode: 'GST',
            levelCodes: ['M1', 'M2']
        },
        {
            code: 'ARCHI',
            name: 'Architecture et Urbanisme',
            facultyCode: 'ARCHI',
            levelCodes: preparatoryLevelCodes
        }
    ],
    courseUnits: [
        {
            code: 'MED-FOND',
            facultyCode: 'MED',
            knowledge_skills_bloc: 'FONDAMENTAL'
        },
        {
            code: 'SIC-COM',
            facultyCode: 'SIC',
            knowledge_skills_bloc: 'CROSS_FUNCTIONAL'
        },
        {
            code: 'ST-FOND',
            facultyCode: 'ST',
            knowledge_skills_bloc: 'FONDAMENTAL'
        },
        {
            code: 'SAE-ENV-CU',
            facultyCode: 'SAE',
            knowledge_skills_bloc: 'DEVELOPMENT'
        },
        {
            code: 'DRT-FOND',
            facultyCode: 'DRT',
            knowledge_skills_bloc: 'FONDAMENTAL'
        },
        {
            code: 'FST-DEV',
            facultyCode: 'FST',
            knowledge_skills_bloc: 'DEVELOPMENT'
        },
        {
            code: 'GST-MGMT',
            facultyCode: 'GST',
            knowledge_skills_bloc: 'CROSS_FUNCTIONAL'
        },
        {
            code: 'ARCHI-URB',
            facultyCode: 'ARCHI',
            knowledge_skills_bloc: 'DEVELOPMENT'
        }
    ],
    professorGrades: [
        { code: 'ASS', name: 'Assistant' },
        { code: 'CT', name: 'Chef de travaux' },
        { code: 'PROF', name: 'Professeur' }
    ],
    privileges: [
        'identity:user:read:all',
        'identity:user:create:all',
        'identity:user:update:all',
        'identity:user:delete:all',
        'identity:user:read:own',
        'identity:user:update:own',
        'identity:profile:read:all',
        'identity:profile:create:all',
        'identity:profile:update:all',
        'identity:profile:delete:all',
        'identity:role:read:all',
        'identity:role:create:all',
        'identity:role:update:all',
        'identity:role:delete:all',
        'identity:privilege:read:all',
        'identity:privilege:create:all',
        'identity:privilege:update:all',
        'identity:privilege:delete:all',
        'identity:api:manage',
        'admission:candidate:read:all',
        'admission:candidate:create:all',
        'admission:candidate:update:all',
        'admission:candidate:delete:all',
        'admission:candidate:read:own',
        'admission:candidate:update:own'
    ],
    roles: [
        {
            name: 'IDENTITY_ADMIN',
            privileges: [
                'identity:user:read:all',
                'identity:user:create:all',
                'identity:user:update:all',
                'identity:user:delete:all',
                'identity:user:read:own',
                'identity:user:update:own',
                'identity:profile:read:all',
                'identity:profile:create:all',
                'identity:profile:update:all',
                'identity:profile:delete:all',
                'identity:role:read:all',
                'identity:role:create:all',
                'identity:role:update:all',
                'identity:role:delete:all',
                'identity:privilege:read:all',
                'identity:privilege:create:all',
                'identity:privilege:update:all',
                'identity:privilege:delete:all',
                'identity:api:manage'
            ]
        },
        {
            name: 'ADMISSION_OFFICER',
            privileges: [
                'admission:candidate:read:all',
                'admission:candidate:create:all',
                'admission:candidate:update:all',
                'admission:candidate:delete:all',
                'identity:user:read:own',
                'identity:user:update:own'
            ]
        },
        {
            name: 'PROFESSOR',
            privileges: [
                'identity:user:read:own',
                'identity:user:update:own',
                'admission:candidate:read:all'
            ]
        },
        {
            name: 'STUDENT',
            privileges: [
                'identity:user:read:own',
                'identity:user:update:own',
                'admission:candidate:read:own',
                'admission:candidate:update:own',
                'admission:candidate:create:all'
            ]
        }
    ],
    profiles: [
        {
            name: 'ADMIN',
            roles: ['IDENTITY_ADMIN', 'ADMISSION_OFFICER']
        },
        {
            name: 'PROFESSOR',
            roles: ['PROFESSOR']
        },
        {
            name: 'STUDENT',
            roles: ['STUDENT']
        },
        {
            name: 'ACADEMIC_SECRETARY',
            roles: ['ADMISSION_OFFICER', 'IDENTITY_ADMIN']
        }
    ],
    users: [
        {
            username: 'admin.staff',
            email: 'admin.staff@smart-campus.org',
            profiles: ['ADMIN'],
            facultyCode: 'FST'
        },
        {
            username: 'professor',
            email: 'professor@smart-campus.org',
            profiles: ['PROFESSOR'],
            facultyCode: 'FST'
        },
        {
            username: 'academic.secretary',
            email: 'academic.secretary@smart-campus.org',
            profiles: ['ACADEMIC_SECRETARY'],
            facultyCode: 'GST'
        },
        {
            username: 'student',
            email: 'student@smart-campus.org',
            profiles: ['STUDENT'],
            facultyCode: 'FST'
        }
    ],
    professors: [
        {
            email: 'jean.mbuyi@smart-campus.org',
            first_name: 'Jean',
            last_name: 'Mbuyi',
            middle_name: 'Kabongo',
            gender: 'MALE',
            birth_date: '1980-05-15',
            birth_place: 'Kinshasa',
            marital_status: 'MARRIED',
            nationality: 'Congolaise',
            phone: '+243840000001',
            facultyCode: 'FST',
            gradeCode: 'PROF'
        },
        {
            email: 'claire.kalala@smart-campus.org',
            first_name: 'Claire',
            last_name: 'Kalala',
            middle_name: 'Mwamba',
            gender: 'FEMALE',
            birth_date: '1988-09-22',
            birth_place: 'Lubumbashi',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            phone: '+243840000002',
            facultyCode: 'GST',
            gradeCode: 'CT'
        }
    ],
    courses: [
        {
            code: 'FST-ALG-101',
            name: 'Algorithmique',
            description: 'Introduction a l algorithmique et aux structures de donnees',
            credits: 5,
            courseUnitCode: 'FST-DEV'
        },
        {
            code: 'GST-MGT-201',
            name: 'Management des organisations',
            description: 'Bases du management des organisations',
            credits: 4,
            courseUnitCode: 'GST-MGMT'
        }
    ],
    courseAssignments: [
        {
            courseCode: 'FST-ALG-101',
            professorEmail: 'jean.mbuyi@smart-campus.org',
            assignment_type: 'LEAD_INSTRUCTOR'
        },
        {
            courseCode: 'GST-MGT-201',
            professorEmail: 'claire.kalala@smart-campus.org',
            assignment_type: 'LEAD_INSTRUCTOR'
        }
    ],
    rooms: [
        {
            name: 'A101',
            location: 'Batiment A - 1er etage',
            capacity: 60,
            type: 'NORMAL'
        },
        {
            name: 'LAB-INF-01',
            location: 'Batiment B - Rez-de-chaussee',
            capacity: 30,
            type: 'LABORATORY'
        },
        {
            name: 'ONLINE-MEET',
            location: 'Virtual',
            capacity: 200,
            type: 'ONLINE',
            link: 'https://meet.smart-campus.org/seed'
        }
    ],
    timetables: [
        {
            programCode: 'FST-IA',
            levelCode: 'L1',
            entries: [
                {
                    courseCode: 'FST-ALG-101',
                    roomName: 'A101',
                    date: '2026-09-08T08:00:00.000Z',
                    start_hour: '08:00:00',
                    end_hour: '10:00:00',
                    session_type: 'LECTURE'
                }
            ]
        }
    ],
    candidatesToValidate: [
        'aline.medecine@example.com',
        'sarah.intelligence-artificielle@example.com',
        'grace.architecture@example.com'
    ],
    candidates: [
        {
            first_name: 'Aline',
            last_name: 'Kasongo',
            middle_name: 'Mbuyi',
            gender: 'FEMALE',
            birth_date: '2005-04-12',
            birth_place: 'Kinshasa',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'aline.medecine@example.com',
            phone: '+243810000001',
            facultyCode: 'MED',
            programCode: 'MED',
            levelCode: 'L1',
            candidatureType: 'NEW',
            academic_background: {
                school_name: 'Institut Mwanga',
                option: 'Scientifique',
                percentage: 76.5,
                graduation_year: 2025,
                study_country: 'RDC',
                study_city: 'Kinshasa'
            }
        },
        {
            first_name: 'David',
            last_name: 'Mwamba',
            middle_name: 'Kalala',
            gender: 'MALE',
            birth_date: '2004-11-03',
            birth_place: 'Lubumbashi',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'david.genie-civil@example.com',
            phone: '+243810000002',
            facultyCode: 'ST',
            programCode: 'ST-GC',
            levelCode: 'L2',
            candidatureType: 'SPECIAL',
            academic_background: {
                school_name: 'College Saint Francois',
                option: 'Mathematiques-Physique',
                percentage: 82,
                graduation_year: 2024,
                study_country: 'RDC',
                study_city: 'Lubumbashi'
            }
        },
        {
            first_name: 'Merveille',
            last_name: 'Kabeya',
            middle_name: 'Nsimba',
            gender: 'FEMALE',
            birth_date: '2006-01-21',
            birth_place: 'Goma',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'merveille.environnement@example.com',
            phone: '+243810000003',
            facultyCode: 'SAE',
            programCode: 'SAE-ENV',
            levelCode: 'L1',
            candidatureType: 'NEW',
            academic_background: {
                school_name: 'Lycee Amani',
                option: 'Biologie-Chimie',
                percentage: 71.25,
                graduation_year: 2025,
                study_country: 'RDC',
                study_city: 'Goma'
            }
        },
        {
            first_name: 'Patrick',
            last_name: 'Ilunga',
            middle_name: 'Tshibangu',
            gender: 'MALE',
            birth_date: '2003-07-18',
            birth_place: 'Kolwezi',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'patrick.droit-minier@example.com',
            phone: '+243810000004',
            facultyCode: 'DRT',
            programCode: 'DRT-MDM',
            levelCode: 'M1',
            candidatureType: 'SPECIAL',
            academic_background: {
                school_name: 'Institut Saint Joseph',
                option: 'Litteraire',
                percentage: 79.5,
                graduation_year: 2023,
                study_country: 'RDC',
                study_city: 'Kolwezi'
            }
        },
        {
            first_name: 'Sarah',
            last_name: 'Tshilombo',
            middle_name: 'Beya',
            gender: 'FEMALE',
            birth_date: '2002-09-30',
            birth_place: 'Kinshasa',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'sarah.intelligence-artificielle@example.com',
            phone: '+243810000005',
            facultyCode: 'FST',
            programCode: 'FST-IA',
            levelCode: 'L4',
            candidatureType: 'NEW',
            academic_background: {
                school_name: 'Complexe Scolaire Horizon',
                option: 'Mathematiques-Informatique',
                percentage: 84.75,
                graduation_year: 2023,
                study_country: 'RDC',
                study_city: 'Kinshasa'
            }
        },
        {
            first_name: 'Joel',
            last_name: 'Mutombo',
            middle_name: 'Kanku',
            gender: 'MALE',
            birth_date: '2004-02-14',
            birth_place: 'Matadi',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'joel.finance-banque@example.com',
            phone: '+243810000006',
            facultyCode: 'GST',
            programCode: 'GST-MFB',
            levelCode: 'M1',
            candidatureType: 'SPECIAL',
            academic_background: {
                school_name: 'Institut Commercial de Matadi',
                option: 'Commerciale et Gestion',
                percentage: 73.9,
                graduation_year: 2024,
                study_country: 'RDC',
                study_city: 'Matadi'
            }
        },
        {
            first_name: 'Nadine',
            last_name: 'Kiala',
            middle_name: 'Lusamba',
            gender: 'FEMALE',
            birth_date: '2005-12-09',
            birth_place: 'Mbuji-Mayi',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'nadine.multimedia@example.com',
            phone: '+243810000007',
            facultyCode: 'SIC',
            programCode: 'SIC',
            levelCode: 'L1',
            candidatureType: 'NEW',
            academic_background: {
                school_name: 'Lycee Tuendelee',
                option: 'Communication',
                percentage: 75.1,
                graduation_year: 2025,
                study_country: 'RDC',
                study_city: 'Mbuji-Mayi'
            }
        },
        {
            first_name: 'Grace',
            last_name: 'Nzuzi',
            middle_name: 'Kiese',
            gender: 'FEMALE',
            birth_date: '2005-06-05',
            birth_place: 'Kinshasa',
            marital_status: 'SINGLE',
            nationality: 'Congolaise',
            email: 'grace.architecture@example.com',
            phone: '+243810000008',
            facultyCode: 'ARCHI',
            programCode: 'ARCHI',
            levelCode: 'L1',
            candidatureType: 'NEW',
            academic_background: {
                school_name: 'Institut Technique Industriel',
                option: 'Construction',
                percentage: 78.2,
                graduation_year: 2025,
                study_country: 'RDC',
                study_city: 'Kinshasa'
            }
        }
    ]
};
class HttpError extends Error {
    constructor(message, status, payload) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

class SmartCampusApi {
    constructor({ baseUrl, username, password }) {
        this.baseUrl = baseUrl;
        this.username = username;
        this.password = password;
        this.accessToken = null;
    }

    async request(path, { method = 'GET', body, query, auth = 'bearer' } = {}) {
        const url = new URL(`${this.baseUrl}${path}`);

        for (const [key, value] of Object.entries(query || {})) {
            if (value === undefined || value === null) {
                continue;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    url.searchParams.append(key, item);
                }
            } else {
                url.searchParams.set(key, String(value));
            }
        }

        const headers = { Accept: 'application/json' };

        if (auth === 'basic') {
            headers.Authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
        }

        if (auth === 'bearer' && this.accessToken) {
            headers.Authorization = `Bearer ${this.accessToken}`;
        }

        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });

        const text = await response.text();
        const payload = parseResponse(text, response.headers.get('content-type'));

        if (!response.ok) {
            throw new HttpError(`${method} ${path} failed with ${response.status}`, response.status, payload);
        }

        return payload;
    }

    async login() {
        const response = await this.request('/api/v1/auth/login', {
            method: 'POST',
            auth: 'none',
            body: {
                email: this.username,
                password: this.password
            }
        });

        this.accessToken = response.access_token;
        return response.user;
    }
}

async function main() {
    const api = new SmartCampusApi(config);

    if (!skipOpenApi) {
        await verifyOpenApi(api);
    }

    const user = await api.login();
    console.log(`[auth] logged in as ${user?.email || config.username}`);

    const context = await seed(api);

    printSummary(context);
}

async function verifyOpenApi(api) {
    const spec = await api.request('/v3/api-docs', { auth: 'basic' });
    const operations = getOpenApiOperations(spec);
    const operationKeys = new Set(operations.map((operation) => `${operation.method} ${operation.path}`));

    console.log(`[openapi] loaded ${operations.length} operations from /v3/api-docs`);

    if (printEndpoints) {
        for (const operation of operations) {
            console.log(`  ${operation.method.toUpperCase().padEnd(6)} ${operation.path} ${operation.operationId || ''}`);
        }
    }

    const missing = requiredSeedEndpoints.filter(([method, path]) => !operationKeys.has(`${method} ${path}`));

    if (missing.length > 0) {
        throw new Error(`OpenAPI contract is missing seed endpoints: ${missing.map(([method, path]) => `${method.toUpperCase()} ${path}`).join(', ')}`);
    }

    console.log(`[openapi] verified ${requiredSeedEndpoints.length} seed endpoints`);
}

async function seed(api) {
    const context = {
        academicYear: null,
        semesters: [],
        faculties: [],
        levels: [],
        programs: [],
        courseUnits: [],
        courses: [],
        professorGrades: [],
        professors: [],
        courseAssignments: [],
        rooms: [],
        timetables: [],
        timetableEntries: [],
        privileges: [],
        roles: [],
        profiles: [],
        users: [],
        candidates: [],
        validatedCandidates: []
    };

    context.academicYear = await ensureAcademicYear(api, seedCatalog.academicYear);
    await activateAcademicYear(api, context.academicYear);

    for (const semester of seedCatalog.semesters) {
        context.semesters.push(
            await ensureByCode(api, {
                label: 'semester',
                listPath: '/api/v1/semesters',
                createPath: '/api/v1/semesters',
                payload: {
                    ...semester,
                    academic_year_id: context.academicYear.id
                }
            })
        );
    }

    for (const faculty of seedCatalog.faculties) {
        context.faculties.push(
            await ensureByCode(api, {
                label: 'faculty',
                listPath: '/api/v1/faculties',
                createPath: '/api/v1/faculties',
                payload: faculty
            })
        );
    }

    const facultiesByCode = indexBy(context.faculties, 'code');

    const levelsByCode = {};

    for (const level of seedCatalog.levels) {
        const ensuredLevel = await ensureLevel(api, level);
        context.levels.push(ensuredLevel);
        levelsByCode[level.code] = ensuredLevel;
    }

    const programsByCode = {};

    for (const program of seedCatalog.programs) {
        const faculty = mustGet(facultiesByCode, program.facultyCode, 'faculty');
        const ensuredProgram = await ensureProgram(api, {
            code: program.code,
            name: program.name,
            faculty_id: faculty.id,
            levels: program.levelCodes.map((levelCode) => ({
                level_id: mustGet(levelsByCode, levelCode, 'level').id,
                is_common: levelCode === 'PREP'
            }))
        });

        context.programs.push(ensuredProgram);
        programsByCode[program.code] = ensuredProgram;
    }

    const courseUnitsByCode = {};

    for (const courseUnit of seedCatalog.courseUnits) {
        const faculty = mustGet(facultiesByCode, courseUnit.facultyCode, 'faculty');
        const ensuredUnit = await ensureCourseUnit(api, {
            code: courseUnit.code,
            faculty_id: faculty.id,
            knowledge_skills_bloc: courseUnit.knowledge_skills_bloc
        });
        context.courseUnits.push(ensuredUnit);
        courseUnitsByCode[courseUnit.code] = ensuredUnit;
    }

    for (const grade of seedCatalog.professorGrades) {
        context.professorGrades.push(
            await ensureByCode(api, {
                label: 'professor grade',
                listPath: '/api/v1/professor-grades',
                createPath: '/api/v1/professor-grades',
                payload: grade
            })
        );
    }

    const gradesByCode = indexBy(context.professorGrades, 'code');

    try {
        const existingPrivileges = await listAll(api, '/api/v1/privileges');
        const privilegesByName = {};

        for (const privilegeName of seedCatalog.privileges) {
            const ensured = await ensurePrivilege(api, privilegeName, existingPrivileges);
            context.privileges.push(ensured);
            privilegesByName[ensured.name] = ensured;

            if (!existingPrivileges.some((item) => equals(item.name, privilegeName))) {
                existingPrivileges.push(ensured);
            }
        }

        const existingRoles = await listAll(api, '/api/v1/roles');
        const rolesByName = {};

        for (const role of seedCatalog.roles) {
            const ensuredRole = await ensureRole(
                api,
                role.name,
                role.privileges.map((name) => ({
                    id: mustGet(privilegesByName, name, 'privilege').id,
                    name
                })),
                existingRoles
            );
            context.roles.push(ensuredRole);
            rolesByName[ensuredRole.name] = ensuredRole;

            if (!existingRoles.some((item) => equals(item.name, role.name))) {
                existingRoles.push(ensuredRole);
            }
        }

        const existingProfiles = await listAll(api, '/api/v1/profiles');
        const profilesByName = {};

        for (const profile of seedCatalog.profiles) {
            const ensuredProfile = await ensureProfileWithRoles(
                api,
                profile.name,
                profile.roles.map((roleName) => ({
                    id: mustGet(rolesByName, roleName, 'role').id,
                    name: roleName
                })),
                existingProfiles
            );
            context.profiles.push(ensuredProfile);
            profilesByName[ensuredProfile.name] = ensuredProfile;

            if (!existingProfiles.some((item) => equals(item.name, profile.name))) {
                existingProfiles.push(ensuredProfile);
            }
        }

        Object.assign(context, { _profilesByName: profilesByName });
    } catch (error) {
        if (!(error instanceof HttpError && [401, 403].includes(error.status))) {
            throw error;
        }

        console.warn(
            `[warn] RBAC seed partially skipped (${error.status}): privilege/role APIs denied for current user. Falling back to profile names only.`
        );

        const existingProfiles = await listAll(api, '/api/v1/profiles');
        const profilesByName = {};

        for (const profile of seedCatalog.profiles) {
            const ensuredProfile = await ensureProfile(api, profile.name, existingProfiles);
            context.profiles.push(ensuredProfile);
            profilesByName[ensuredProfile.name] = ensuredProfile;

            if (!existingProfiles.some((item) => equals(item.name, profile.name))) {
                existingProfiles.push(ensuredProfile);
            }
        }

        Object.assign(context, { _profilesByName: profilesByName });
    }

    const profilesByName = context._profilesByName;
    delete context._profilesByName;

    for (const user of seedCatalog.users) {
        const faculty = mustGet(facultiesByCode, user.facultyCode, 'faculty');
        context.users.push(
            await ensureUser(api, {
                username: user.username,
                email: user.email,
                profiles: user.profiles.map((profileName) => mustGet(profilesByName, profileName, 'profile').id),
                faculty_id: faculty.id
            })
        );
    }

    for (const candidate of seedCatalog.candidates) {
        const faculty = mustGet(facultiesByCode, candidate.facultyCode, 'faculty');
        const program = mustGet(programsByCode, candidate.programCode, 'program');
        const level = mustGet(levelsByCode, candidate.levelCode, 'level');

        context.candidates.push(
            await ensureCandidate(api, {
                faculty_id: faculty.id,
                program_id: program.id,
                level_id: level.id,
                first_name: candidate.first_name,
                last_name: candidate.last_name,
                middle_name: candidate.middle_name,
                gender: candidate.gender,
                birth_date: candidate.birth_date,
                birth_place: candidate.birth_place,
                marital_status: candidate.marital_status,
                nationality: candidate.nationality,
                email: candidate.email,
                phone: candidate.phone,
                origin: {
                    province: 'Kinshasa',
                    territory: 'Lukunga',
                    sector: 'Gombe',
                    commune: 'Gombe'
                },
                tutor: {
                    full_name: `${candidate.last_name} Parent`,
                    email: `parent.${candidate.email}`,
                    phone: '+243820000000',
                    profession: 'Entrepreneur'
                },
                emergency_contact: {
                    full_name: `${candidate.last_name} Contact`,
                    email: `contact.${candidate.email}`,
                    phone: '+243830000000',
                    relationship: 'Parent'
                },
                academic_background: candidate.academic_background,
                candidature: {
                    type: candidate.candidatureType
                }
            })
        );
    }

    const candidatesByEmail = Object.fromEntries(
        context.candidates
            .filter((candidate) => candidate?.email && !candidate.skipped)
            .map((candidate) => [String(candidate.email).toLowerCase(), candidate])
    );

    for (const email of seedCatalog.candidatesToValidate) {
        const candidate = candidatesByEmail[String(email).toLowerCase()];

        if (!candidate?.id) {
            console.warn(`[skip] validate candidate missing: ${email}`);
            continue;
        }

        try {
            context.validatedCandidates.push(await ensureCandidateValidated(api, candidate));
        } catch (error) {
            if (error instanceof HttpError && [401, 403, 409].includes(error.status)) {
                console.warn(`[skip] validate candidate ${email}: ${error.status}`);
                continue;
            }

            throw error;
        }
    }

    const coursesByCode = {};

    for (const course of seedCatalog.courses) {
        const courseUnit = mustGet(courseUnitsByCode, course.courseUnitCode, 'course unit');
        const ensuredCourse = await ensureCourse(api, {
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            course_unit_id: courseUnit.id
        });
        context.courses.push(ensuredCourse);
        coursesByCode[course.code] = ensuredCourse;
    }

    const professorsByEmail = {};

    for (const professor of seedCatalog.professors) {
        const faculty = mustGet(facultiesByCode, professor.facultyCode, 'faculty');
        const grade = mustGet(gradesByCode, professor.gradeCode, 'professor grade');
        const ensuredProfessor = await ensureProfessor(api, {
            faculty_id: faculty.id,
            professor_grade_id: grade.id,
            first_name: professor.first_name,
            last_name: professor.last_name,
            middle_name: professor.middle_name,
            gender: professor.gender,
            birth_date: professor.birth_date,
            birth_place: professor.birth_place,
            marital_status: professor.marital_status,
            nationality: professor.nationality,
            email: professor.email,
            phone: professor.phone
        });
        context.professors.push(ensuredProfessor);
        professorsByEmail[String(professor.email).toLowerCase()] = ensuredProfessor;
    }

    const assignmentsByCourseCode = {};

    for (const assignment of seedCatalog.courseAssignments) {
        const course = mustGet(coursesByCode, assignment.courseCode, 'course');
        const professor = mustGet(professorsByEmail, String(assignment.professorEmail).toLowerCase(), 'professor');
        const ensuredAssignment = await ensureCourseAssignment(api, {
            course_id: course.id,
            professor_id: professor.id,
            academic_year_id: context.academicYear.id,
            assignment_type: assignment.assignment_type
        }, assignment.courseCode);
        context.courseAssignments.push(ensuredAssignment);
        assignmentsByCourseCode[assignment.courseCode] = ensuredAssignment;
    }

    const roomsByName = {};

    for (const room of seedCatalog.rooms) {
        const ensuredRoom = await ensureRoom(api, room);
        context.rooms.push(ensuredRoom);
        roomsByName[room.name] = ensuredRoom;
    }

    for (const timetableSpec of seedCatalog.timetables) {
        const program = mustGet(programsByCode, timetableSpec.programCode, 'program');
        const programMeta = seedCatalog.programs.find((item) => item.code === timetableSpec.programCode);
        const facultyEntity =
            context.faculties.find((item) => item.id === program.faculty_id) ||
            mustGet(facultiesByCode, programMeta?.facultyCode, 'faculty');
        const level = mustGet(levelsByCode, timetableSpec.levelCode, 'level');

        const ensuredTimetable = await ensureTimetable(api, {
            faculty_id: facultyEntity.id,
            faculty_name: facultyEntity.name,
            program_id: program.id,
            program_name: program.name,
            program_level_id: level.id,
            program_level_name: level.name || level.code || timetableSpec.levelCode
        }, `${timetableSpec.programCode}-${timetableSpec.levelCode}`);

        context.timetables.push(ensuredTimetable);

        for (const entry of timetableSpec.entries) {
            const assignment = mustGet(assignmentsByCourseCode, entry.courseCode, 'course assignment');
            const room = mustGet(roomsByName, entry.roomName, 'room');

            try {
                context.timetableEntries.push(
                    await ensureTimetableEntry(api, {
                        timetable_id: ensuredTimetable.id,
                        course_assignment_id: assignment.id,
                        room_id: room.id,
                        date: entry.date,
                        start_hour: entry.start_hour,
                        end_hour: entry.end_hour,
                        session_type: entry.session_type,
                        note: entry.note || 'Seed session'
                    }, `${timetableSpec.programCode}-${entry.courseCode}-${entry.date}`)
                );
            } catch (error) {
                if (error instanceof HttpError && [400, 404, 409, 422].includes(error.status)) {
                    console.warn(
                        `[skip] timetable entry ${timetableSpec.programCode}/${entry.courseCode}: ${error.status} ${error.payload?.detail || error.message}`
                    );
                    continue;
                }

                throw error;
            }
        }
    }

    return context;
}

async function ensureAcademicYear(api, payload) {
    const years = await listAll(api, '/api/v1/academic-years');
    const existing = years.find((year) => equals(year.label, payload.label));

    if (existing) {
        return found('academic year', existing.label, existing);
    }

    return create(api, 'academic year', '/api/v1/academic-years', payload);
}

async function activateAcademicYear(api, academicYear) {
    const current = await getCurrentAcademicYear(api);

    if (current?.id === academicYear.id) {
        console.log(`[keep] academic year active: ${academicYear.label}`);
        return;
    }

    if (checkOnly) {
        console.log(`[check] would activate academic year: ${academicYear.label}`);
        return;
    }

    await api.request(`/api/v1/academic-years/${academicYear.id}/activate`, { method: 'PATCH' });
    console.log(`[patch] academic year active: ${academicYear.label}`);
}

async function getCurrentAcademicYear(api) {
    try {
        return await api.request('/api/v1/academic-years/current');
    } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
            return null;
        }

        throw error;
    }
}

async function ensureLevel(api, payload) {
    const items = await listAll(api, '/api/v1/levels');
    const existing = items.find((item) => equals(item.code, payload.code) || equals(item.name, payload.name));

    if (existing) {
        return found('level', `${payload.code} (${payload.name})`, existing);
    }

    return create(api, 'level', '/api/v1/levels', payload);
}

async function ensureProgram(api, payload) {
    const items = await listAll(api, '/api/v1/programs');
    const existing = items.find((item) => equals(item.code, payload.code) || equals(item.name, payload.name));

    if (existing) {
        return found('program', `${payload.code} (${payload.name})`, existing);
    }

    return create(api, 'program', '/api/v1/programs', payload);
}

async function ensureByCode(api, { label, listPath, createPath, payload }) {
    const items = await listAll(api, listPath);
    const existing = items.find((item) => equals(item.code, payload.code) || (payload.name && equals(item.name, payload.name)) || (payload.label && equals(item.label, payload.label)));

    if (existing) {
        return found(label, payload.code, existing);
    }

    return create(api, label, createPath, payload);
}

async function ensureCourseUnit(api, payload) {
    const items = await listAll(api, `/api/v1/course-units/faculty/${payload.faculty_id}`);
    const existing = items.find((item) => equals(item.code, payload.code) || (payload.name && equals(item.name, payload.name)) || (payload.label && equals(item.label, payload.label)));

    if (existing) {
        return found('course unit', payload.code, existing);
    }

    return create(api, 'course unit', '/api/v1/course-units', payload);
}

async function ensurePrivilege(api, privilegeName, knownPrivileges = null) {
    const privileges = knownPrivileges ?? (await listAll(api, '/api/v1/privileges'));
    const existing = privileges.find((privilege) => equals(privilege.name, privilegeName));

    if (existing) {
        return found('privilege', privilegeName, existing);
    }

    return create(api, 'privilege', '/api/v1/privileges', { name: privilegeName });
}

async function ensureRole(api, roleName, privileges, knownRoles = null) {
    const roles = knownRoles ?? (await listAll(api, '/api/v1/roles'));
    let role = roles.find((item) => equals(item.name, roleName));

    if (!role) {
        role = await create(api, 'role', '/api/v1/roles', { name: roleName });
    } else {
        found('role', roleName, role);
    }

    const existingKeys = new Set();

    for (const privilege of role.privileges || []) {
        if (typeof privilege === 'string') {
            existingKeys.add(String(privilege).toLowerCase());
            continue;
        }

        if (privilege?.id) {
            existingKeys.add(String(privilege.id).toLowerCase());
        }

        if (privilege?.name) {
            existingKeys.add(String(privilege.name).toLowerCase());
        }
    }

    const missingPrivilegeIds = privileges
        .filter((privilege) => {
            const idKey = String(privilege.id).toLowerCase();
            const nameKey = String(privilege.name).toLowerCase();
            return !existingKeys.has(idKey) && !existingKeys.has(nameKey);
        })
        .map((privilege) => privilege.id);

    if (missingPrivilegeIds.length) {
        if (checkOnly) {
            console.log(`[check] would attach ${missingPrivilegeIds.length} privilege(s) to role ${roleName}`);
        } else {
            await api.request(`/api/v1/roles/${role.id}/privileges`, {
                method: 'POST',
                body: { privilege_ids: missingPrivilegeIds }
            });
            console.log(`[post] attached ${missingPrivilegeIds.length} privilege(s) to role ${roleName}`);
            role = {
                ...role,
                privileges: [...(role.privileges || []), ...missingPrivilegeIds]
            };
        }
    }

    return role;
}

async function ensureProfile(api, profileName, knownProfiles = null) {
    const profiles = knownProfiles ?? (await listAll(api, '/api/v1/profiles'));
    const existing = profiles.find((profile) => equals(profile.name, profileName));

    if (existing) {
        return found('profile', profileName, existing);
    }

    return create(api, 'profile', '/api/v1/profiles', { name: profileName });
}

async function ensureProfileWithRoles(api, profileName, roles, knownProfiles = null) {
    let profile = await ensureProfile(api, profileName, knownProfiles);
    const existingKeys = new Set();

    for (const role of profile.roles || []) {
        if (typeof role === 'string') {
            existingKeys.add(String(role).toLowerCase());
            continue;
        }

        if (role?.id) {
            existingKeys.add(String(role.id).toLowerCase());
        }

        if (role?.name) {
            existingKeys.add(String(role.name).toLowerCase());
        }
    }

    const missingRoleIds = roles
        .filter((role) => {
            const idKey = String(role.id).toLowerCase();
            const nameKey = String(role.name).toLowerCase();
            return !existingKeys.has(idKey) && !existingKeys.has(nameKey);
        })
        .map((role) => role.id);

    if (missingRoleIds.length) {
        if (checkOnly) {
            console.log(`[check] would attach ${missingRoleIds.length} role(s) to profile ${profileName}`);
        } else {
            await api.request(`/api/v1/profiles/${profile.id}/roles`, {
                method: 'POST',
                body: { role_ids: missingRoleIds }
            });
            console.log(`[post] attached ${missingRoleIds.length} role(s) to profile ${profileName}`);
            profile = {
                ...profile,
                roles: [...(profile.roles || []), ...missingRoleIds]
            };
        }
    }

    return profile;
}

async function ensureCandidateValidated(api, candidate) {
    const status = candidate.candidature?.status || candidate.status;

    if (status === 'VALIDATED') {
        return found('validated candidate', candidate.email, candidate);
    }

    if (checkOnly) {
        console.log(`[check] would validate candidate: ${candidate.email}`);
        return { ...candidate, candidature: { ...(candidate.candidature || {}), status: 'VALIDATED' } };
    }

    await api.request(`/api/v1/candidates/${candidate.id}/validate`, {
        method: 'POST',
        body: {}
    });
    console.log(`[post] validated candidate: ${candidate.email}`);

    return {
        ...candidate,
        candidature: {
            ...(candidate.candidature || {}),
            status: 'VALIDATED'
        }
    };
}

async function ensureCourse(api, payload) {
    const courses = await listAll(api, '/api/v1/courses');
    const existing = courses.find((course) => equals(course.code, payload.code));

    if (existing) {
        return found('course', payload.code, existing);
    }

    return create(api, 'course', '/api/v1/courses', payload);
}

async function ensureProfessor(api, payload) {
    const professors = await listAll(api, '/api/v1/professors');
    const existing = professors.find((professor) => equals(professor.email, payload.email));

    if (existing) {
        return found('professor', payload.email, existing);
    }

    return create(api, 'professor', '/api/v1/professors', payload);
}

async function ensureCourseAssignment(api, payload, identity) {
    try {
        const byCourse = await api.request(`/api/v1/course-assignments/course/${payload.course_id}`);
        const assignments = Array.isArray(byCourse) ? byCourse : byCourse?.content || [];
        const existing = assignments.find(
            (assignment) =>
                equals(assignment.professor_id, payload.professor_id) &&
                equals(assignment.academic_year_id, payload.academic_year_id)
        );

        if (existing) {
            return found('course assignment', identity, existing);
        }
    } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) {
            console.warn(`[warn] could not list course assignments for ${identity}: ${error.message}`);
        }
    }

    return create(api, 'course assignment', '/api/v1/course-assignments', payload, {
        identity
    });
}

async function ensureRoom(api, payload) {
    const rooms = await listAll(api, '/api/v1/rooms');
    const existing = rooms.find((room) => equals(room.name, payload.name));

    if (existing) {
        return found('room', payload.name, existing);
    }

    return create(api, 'room', '/api/v1/rooms', payload);
}

async function ensureTimetable(api, payload, identity) {
    const timetables = await listAll(api, '/api/v1/timetables');
    const existing = timetables.find(
        (timetable) =>
            equals(timetable.program_id, payload.program_id) &&
            equals(timetable.program_level_id, payload.program_level_id)
    );

    if (existing) {
        return found('timetable', identity, existing);
    }

    return create(api, 'timetable', '/api/v1/timetables', payload, {
        identity
    });
}

async function ensureTimetableEntry(api, payload, identity) {
    try {
        const entriesResponse = await api.request(`/api/v1/timetable-entries/timetable/${payload.timetable_id}`);
        const entries = Array.isArray(entriesResponse) ? entriesResponse : entriesResponse?.content || [];
        const existing = entries.find(
            (entry) =>
                equals(entry.course_assignment_id, payload.course_assignment_id) &&
                String(entry.date || '').startsWith(String(payload.date).slice(0, 10)) &&
                equals(entry.start_hour, payload.start_hour)
        );

        if (existing) {
            return found('timetable entry', identity, existing);
        }
    } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) {
            console.warn(`[warn] could not list timetable entries for ${identity}: ${error.message}`);
        }
    }

    return create(api, 'timetable entry', '/api/v1/timetable-entries', payload, {
        identity
    });
}

async function ensureUser(api, payload) {
    const users = await listAll(api, '/api/v1/users');
    const existing = users.find((user) => equals(user.email, payload.email));

    if (existing) {
        return found('user', payload.email, existing);
    }

    try {
        return await create(api, 'user', '/api/v1/auth/register', payload);
    } catch (error) {
        if (payload.faculty_id && shouldRetryUserWithoutFaculty(error)) {
            console.warn(`[warn] user ${payload.email} rejected with faculty_id; retrying without faculty_id`);
            const fallbackPayload = { ...payload };
            delete fallbackPayload.faculty_id;
            return create(api, 'user', '/api/v1/auth/register', fallbackPayload);
        }

        throw error;
    }
}

function shouldRetryUserWithoutFaculty(error) {
    if (!(error instanceof HttpError)) {
        return false;
    }

    return [400, 422].includes(error.status) || isFacultyForeignKeyError(error);
}

function isFacultyForeignKeyError(error) {
    if (!(error instanceof HttpError) || error.status !== 500) {
        return false;
    }

    const detail = typeof error.payload === 'string' ? error.payload : error.payload?.detail;
    return /fk_users_faculty|foreign key constraint|users_faculty/i.test(String(detail || ''));
}

async function ensureCandidate(api, payload) {
    const candidates = await listAll(api, '/api/v1/candidates');
    const existing = candidates.find((candidate) => equals(candidate.email, payload.email));

    if (existing) {
        return found('candidate', payload.email, existing);
    }

    try {
        return await create(api, 'candidate', '/api/v1/candidates', payload, { retryRateLimit: true });
    } catch (error) {
        if (isFacultyForeignKeyError(error)) {
            console.warn(`[skip] candidate ${payload.email} rejected by backend faculty FK while creating the linked user`);
            return {
                email: payload.email,
                skipped: true
            };
        }

        if (error instanceof HttpError && error.status === 429) {
            console.warn(`[skip] candidate ${payload.email} rejected by backend rate limit`);
            return {
                email: payload.email,
                skipped: true
            };
        }

        throw error;
    }
}

async function create(api, label, path, payload, options = {}) {
    const identity =
        options.identity ||
        payload.code ||
        payload.email ||
        payload.label ||
        payload.name ||
        label;
    const retryRateLimit = options.retryRateLimit ?? true;
    const body = options.stripIdentityKeys
        ? Object.fromEntries(
            Object.entries(payload).filter(([key]) => !['code'].includes(key))
        )
        : payload;

    if (checkOnly) {
        console.log(`[check] would create ${label}: ${identity}`);
        return {
            id: deterministicUuid(identity),
            ...payload
        };
    }

    for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
            const created = await api.request(path, {
                method: 'POST',
                body
            });

            console.log(`[post] created ${label}: ${identity}`);
            return created;
        } catch (error) {
            if (retryRateLimit && error instanceof HttpError && error.status === 429 && attempt < 4) {
                const delayMs = 65000;
                console.warn(`[retry] ${label}: ${identity} hit rate limit, retrying in ${Math.round(delayMs / 1000)}s`);
                await sleep(delayMs);
                continue;
            }

            throw error;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function found(label, identity, item) {
    console.log(`[keep] ${label}: ${identity}`);
    return item;
}

async function listAll(api, path) {
    const all = [];
    let page = 0;
    const size = 100;

    while (true) {
        const response = await api.request(path, {
            query: { page, size }
        });

        if (!response) {
            return all;
        }

        if (Array.isArray(response)) {
            return response;
        }

        if (!Array.isArray(response.content)) {
            return response.content ? [response.content] : all;
        }

        all.push(...response.content);

        const totalPages = response.total_pages ?? response.totalPages ?? 1;
        if (page + 1 >= totalPages) {
            return all;
        }

        page += 1;
    }
}

function getOpenApiOperations(spec) {
    const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);
    const operations = [];

    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
        for (const [method, operation] of Object.entries(pathItem || {})) {
            if (!methods.has(method)) {
                continue;
            }

            operations.push({
                method,
                path,
                operationId: operation.operationId
            });
        }
    }

    return operations.sort((left, right) => `${left.path} ${left.method}`.localeCompare(`${right.path} ${right.method}`));
}

function printSummary(context) {
    const rows = [
        ['academicYear', context.academicYear ? 1 : 0],
        ['semesters', context.semesters.length],
        ['faculties', context.faculties.length],
        ['levels', context.levels.length],
        ['programs', context.programs.length],
        ['courseUnits', context.courseUnits.length],
        ['courses', context.courses.length],
        ['professorGrades', context.professorGrades.length],
        ['professors', context.professors.length],
        ['courseAssignments', context.courseAssignments.length],
        ['rooms', context.rooms.length],
        ['timetables', context.timetables.length],
        ['timetableEntries', context.timetableEntries.length],
        ['privileges', context.privileges.length],
        ['roles', context.roles.length],
        ['profiles', context.profiles.length],
        ['users', context.users.length],
        ['candidates', context.candidates.filter((candidate) => !candidate.skipped).length],
        ['validatedCandidates', context.validatedCandidates.length],
        ['skippedCandidates', context.candidates.filter((candidate) => candidate.skipped).length]
    ];

    console.log('');
    console.log(checkOnly ? 'Check complete. Planned seed data:' : 'Seed complete. Available seed data:');

    for (const [name, count] of rows) {
        console.log(`  ${name.padEnd(20)} ${count}`);
    }
}

function parseResponse(text, contentType) {
    if (!text) {
        return null;
    }

    if (contentType?.includes('application/json') || /^[\[{]/.test(text.trim())) {
        return JSON.parse(text);
    }

    return text;
}

function indexBy(items, fieldName) {
    return Object.fromEntries(items.map((item) => [item[fieldName], item]));
}

function mustGet(index, key, label) {
    const item = index[key];

    if (!item) {
        throw new Error(`Missing ${label}: ${key}`);
    }

    return item;
}

function equals(left, right) {
    return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

function deterministicUuid(value) {
    let hash = 0n;

    for (const char of slug(value)) {
        hash = (hash * 31n + BigInt(char.charCodeAt(0))) & 0xffffffffffffn;
    }

    return `00000000-0000-4000-8000-${hash.toString(16).padStart(12, '0')}`;
}
function slug(value) {
    return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}

main().catch((error) => {
    if (error instanceof HttpError) {
        console.error(error.message);
        if (error.payload) {
            console.error(JSON.stringify(error.payload, null, 2));
        }
    } else {
        console.error(error.stack || error.message);
    }

    process.exit(1);
});
