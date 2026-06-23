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
    ['get', '/api/v1/professor-grades'],
    ['post', '/api/v1/professor-grades'],
    ['get', '/api/v1/profiles'],
    ['post', '/api/v1/profiles'],
    ['get', '/api/v1/users'],
    ['post', '/api/v1/auth/register'],
    ['get', '/api/v1/candidates'],
    ['post', '/api/v1/candidates']
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
            code: 'S1-2026-SEED',
            name: 'Semestre 1 2026-2027',
            semester_order: 1,
            start_date: '2026-09-01',
            end_date: '2027-01-31'
        },
        {
            code: 'S2-2027-SEED',
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
            name: 'Facult\u00e9 de M\u00e9decine',
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
            levelCodes: ['PREP', 'L1', 'L2', 'L3']
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
            name: '\u00c9cole Sup\u00e9rieure d\u2019Architecture et d\u2019Urbanisme',
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
        { code: 'ASS-SEED', name: 'Assistant' },
        { code: 'CT-SEED', name: 'Chef de travaux' },
        { code: 'PROF-SEED', name: 'Professeur' }
    ],
    profiles: ['PROFESSOR', 'STUDENT', 'ACADEMIC_SECRETARY'],
    users: [
        {
            username: 'seed.professor',
            email: 'seed.professor@smart-campus.org',
            profiles: ['PROFESSOR'],
            facultyCode: 'FST'
        },
        {
            username: 'seed.secretary',
            email: 'seed.secretary@smart-campus.org',
            profiles: ['ACADEMIC_SECRETARY'],
            facultyCode: 'GST'
        },
        {
            username: 'seed.student',
            email: 'seed.student@smart-campus.org',
            profiles: ['STUDENT'],
            facultyCode: 'FST'
        }
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
            email: 'aline.medecine.seed@example.com',
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
            email: 'david.genie-civil.seed@example.com',
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
            email: 'merveille.environnement.seed@example.com',
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
            email: 'patrick.droit-minier.seed@example.com',
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
            email: 'sarah.intelligence-artificielle.seed@example.com',
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
            email: 'joel.finance-banque.seed@example.com',
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
            email: 'nadine.multimedia.seed@example.com',
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
            email: 'grace.architecture.seed@example.com',
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
        professorGrades: [],
        profiles: [],
        users: [],
        candidates: []
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

    for (const courseUnit of seedCatalog.courseUnits) {
        const faculty = mustGet(facultiesByCode, courseUnit.facultyCode, 'faculty');
        context.courseUnits.push(
            await ensureCourseUnit(api, {
                code: courseUnit.code,
                faculty_id: faculty.id,
                knowledge_skills_bloc: courseUnit.knowledge_skills_bloc
            })
        );
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

    for (const profile of seedCatalog.profiles) {
        context.profiles.push(await ensureProfile(api, profile));
    }

    const profilesByName = indexBy(context.profiles, 'name');

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
    const existing = items.find((item) => equals(item.code, payload.code));

    if (existing) {
        return found(label, payload.code, existing);
    }

    return create(api, label, createPath, payload);
}

async function ensureCourseUnit(api, payload) {
    const items = await listAll(api, `/api/v1/course-units/faculty/${payload.faculty_id}`);
    const existing = items.find((item) => equals(item.code, payload.code));

    if (existing) {
        return found('course unit', payload.code, existing);
    }

    return create(api, 'course unit', '/api/v1/course-units', payload);
}

async function ensureProfile(api, profileName) {
    const profiles = await listAll(api, '/api/v1/profiles');
    const existing = profiles.find((profile) => equals(profile.name, profileName));

    if (existing) {
        return found('profile', profileName, existing);
    }

    return create(api, 'profile', '/api/v1/profiles', { name: profileName });
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
        if (payload.faculty_id && error instanceof HttpError && [400, 422].includes(error.status)) {
            console.warn(`[warn] user ${payload.email} rejected with faculty_id; retrying with faculty_id=null`);
            return create(api, 'user', '/api/v1/auth/register', { ...payload, faculty_id: null });
        }

        throw error;
    }
}

async function ensureCandidate(api, payload) {
    const candidates = await listAll(api, '/api/v1/candidates');
    const existing = candidates.find((candidate) => equals(candidate.email, payload.email));

    if (existing) {
        return found('candidate', payload.email, existing);
    }

    return create(api, 'candidate', '/api/v1/candidates', payload);
}

async function create(api, label, path, payload) {
    const identity = payload.code || payload.email || payload.label || payload.name;

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
                body: payload
            });

            console.log(`[post] created ${label}: ${identity}`);
            return created;
        } catch (error) {
            if (error instanceof HttpError && error.status === 429 && attempt < 4) {
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
        ['professorGrades', context.professorGrades.length],
        ['profiles', context.profiles.length],
        ['users', context.users.length],
        ['candidates', context.candidates.length]
    ];

    console.log('');
    console.log(checkOnly ? 'Check complete. Planned seed data:' : 'Seed complete. Available seed data:');

    for (const [name, count] of rows) {
        console.log(`  ${name.padEnd(16)} ${count}`);
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
