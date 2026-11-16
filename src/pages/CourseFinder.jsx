import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// ============================================================================
// INITIAL SEED COURSE CATALOG (Rich multi-country baseline matching reference)
// ============================================================================
const DEFAULT_COURSES = [
  {
    id: 'cf-1',
    university: 'Global Business School (GBS), Malta',
    logo: 'GBS',
    logoColor: '#36D1DC',
    country: 'Malta',
    countryFlag: '🇲🇹',
    region: 'Central Region, Malta',
    campus: 'St. Julian’s Campus',
    websiteUrl: 'https://gbs.edu.mt/courses/bsc-hons-computer-science-and-information-technology/',
    portalUrl: 'https://studyinmalta.biz',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'BSc (Hons) Computer Science and Information Technology',
    level: 'UG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Software & Information Systems',
    duration: '36 months',
    durationYears: '2 - 3 Years',
    yearlyTuition: 'EUR 6,000',
    tuitionNumeric: 6000,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 960 (16%)',
    commissionNumeric: 960,
    intakes: ['May', 'Oct'],
    closedIntakes: ['Feb'],
    applicationDeadline: 'Feb: 14 Oct 2026, May: 12 Feb 2027, Oct: 25 Jun 2027',
    englishRequirements: {
      pteOverall: 52,
      pteNoBandLess: 42,
      toeflOverall: 76,
      toeflNoBandLess: 19,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 5.5,
      detScore: 105,
      moiAccepted: true,
    },
    standardizedTests: 'No Test Requirement (GRE/GMAT/SAT Not Required)',
    entryRequirements: 'Grade 12 with minimum 50% and at least one subject in computing, information technology, or a related field. Students will be required to attend an admissions interview.',
    remarks: 'PTE Overall score should be 52; 48 in Reading, 43 in Listening, 42 in Speaking, 51 in Writing. MOI accepted for students with English medium secondary education. Direct post-study work visa eligible.',
    tags: ['Faster Offer TAT', 'Affordable University', 'MOI Accepted'],
  },
  {
    id: 'cf-2',
    university: 'Global Business School (GBS), Malta',
    logo: 'GBS',
    logoColor: '#36D1DC',
    country: 'Malta',
    countryFlag: '🇲🇹',
    region: 'Central Region, Malta',
    campus: 'St. Julian’s Campus',
    websiteUrl: 'https://gbs.edu.mt/courses/',
    portalUrl: 'https://studyinmalta.biz',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: false,
    programName: 'BSc (Hons) Health, Social Care and Wellbeing',
    level: 'UG',
    studyArea: 'Health, Medicine & Nursing',
    disciplineArea: 'Public Health & Healthcare Management',
    duration: '36 months',
    durationYears: '2 - 3 Years',
    yearlyTuition: 'EUR 6,000',
    tuitionNumeric: 6000,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 960 (16%)',
    commissionNumeric: 960,
    intakes: ['May', 'Oct'],
    closedIntakes: ['Feb'],
    applicationDeadline: 'Rolling Admissions for Upcoming Intake',
    englishRequirements: {
      pteOverall: 50,
      pteNoBandLess: 42,
      toeflOverall: 74,
      toeflNoBandLess: 18,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 5.5,
      detScore: 100,
      moiAccepted: true,
    },
    standardizedTests: 'No Test Requirement',
    entryRequirements: 'Higher Secondary School Certificate (Grade 12) with 50% aggregate score.',
    remarks: 'High local healthcare demand in Malta. Practical placements and internships included.',
    tags: ['Faster Offer TAT', 'Affordable University'],
  },
  {
    id: 'cf-3',
    university: 'Global Business School (GBS), Malta',
    logo: 'GBS',
    logoColor: '#36D1DC',
    country: 'Malta',
    countryFlag: '🇲🇹',
    region: 'Central Region, Malta',
    campus: 'St. Julian’s Campus',
    websiteUrl: 'https://gbs.edu.mt/courses/',
    portalUrl: 'https://studyinmalta.biz',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'MA Business Management',
    level: 'PG',
    studyArea: 'Commerce, Business and Administration',
    disciplineArea: 'Strategic Business & Leadership',
    duration: '12 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'EUR 8,000',
    tuitionNumeric: 8000,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 1,280 (16%)',
    commissionNumeric: 1280,
    intakes: ['Feb', 'May', 'Oct'],
    closedIntakes: [],
    applicationDeadline: 'Open for 2026/2027 Intakes',
    englishRequirements: {
      pteOverall: 58,
      pteNoBandLess: 50,
      toeflOverall: 80,
      toeflNoBandLess: 20,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 110,
      moiAccepted: true,
    },
    standardizedTests: 'No GRE / GMAT required',
    entryRequirements: 'Recognised Bachelor’s degree in any discipline with minimum 50% or relevant managerial experience.',
    remarks: 'Dual-accredited European master’s degree. Fast-track 1-year postgraduate pathway.',
    tags: ['Faster Offer TAT', 'Scholarship Available'],
  },
  {
    id: 'cf-4',
    university: 'Berlin School of Business and Innovation (BSBI)',
    logo: 'BSBI',
    logoColor: '#00E5A0',
    country: 'Germany',
    countryFlag: '🇩🇪',
    region: 'Berlin, Germany',
    campus: 'Berlin Main Campus',
    websiteUrl: 'https://www.berlinsbi.com/programmes',
    portalUrl: 'https://www.daad.de/en/study-and-research-in-germany/courses-of-study-in-germany/',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'Global MBA (Master of Business Administration)',
    level: 'PG',
    studyArea: 'Commerce, Business and Administration',
    disciplineArea: 'Executive Management & FinTech',
    duration: '18 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'EUR 13,500',
    tuitionNumeric: 13500,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 2,430 (18%)',
    commissionNumeric: 2430,
    intakes: ['Feb', 'May', 'Oct'],
    closedIntakes: [],
    applicationDeadline: 'Oct 2026 / Feb 2027',
    englishRequirements: {
      pteOverall: 56,
      pteNoBandLess: 50,
      toeflOverall: 80,
      toeflNoBandLess: 19,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 5.5,
      detScore: 105,
      moiAccepted: true,
    },
    standardizedTests: 'GMAT / GRE Waiver Available',
    entryRequirements: 'Bachelor’s degree from an H+ listed university in Anabin. Minimum 1 year work experience preferred.',
    remarks: 'Up to 33% high-achiever scholarship available. Free German language coaching included for 18-month stay-back visa.',
    tags: ['Scholarship Available', 'Faster Offer TAT', '18-Mo Stayback'],
  },
  {
    id: 'cf-5',
    university: 'Berlin School of Business and Innovation (BSBI)',
    logo: 'BSBI',
    logoColor: '#00E5A0',
    country: 'Germany',
    countryFlag: '🇩🇪',
    region: 'Berlin, Germany',
    campus: 'Berlin Main Campus',
    websiteUrl: 'https://www.berlinsbi.com/programmes',
    portalUrl: 'https://www.daad.de',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'BSc (Hons) Computer Science and Digitisation',
    level: 'UG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Applied AI & Cloud Systems',
    duration: '36 months',
    durationYears: '2 - 3 Years',
    yearlyTuition: 'EUR 9,500',
    tuitionNumeric: 9500,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 1,710 (18%)',
    commissionNumeric: 1710,
    intakes: ['Feb', 'Oct'],
    closedIntakes: [],
    applicationDeadline: 'Rolling for 2026/2027',
    englishRequirements: {
      pteOverall: 54,
      pteNoBandLess: 48,
      toeflOverall: 78,
      toeflNoBandLess: 18,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 5.5,
      detScore: 100,
      moiAccepted: false,
    },
    standardizedTests: 'No Test Requirement',
    entryRequirements: 'High School Diploma (12 years of education) with mathematics/computing background.',
    remarks: 'Hands-on tech lab modules in Berlin. Strong post-graduation employment pipeline with Berlin tech startups.',
    tags: ['STEM Programs', 'Scholarship Available'],
  },
  {
    id: 'cf-6',
    university: 'University of Europe for Applied Sciences (UE)',
    logo: 'UE',
    logoColor: '#7C6FFF',
    country: 'Germany',
    countryFlag: '🇩🇪',
    region: 'Potsdam / Berlin, Germany',
    campus: 'Innovation Hub Potsdam',
    websiteUrl: 'https://www.ue-germany.com/programmes',
    portalUrl: 'https://www.uni-assist.de/en/',
    fasterOfferTAT: true,
    affordable: false,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'M.Sc. Data Science & Big Data Technologies',
    level: 'PG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Big Data & Machine Learning',
    duration: '24 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'EUR 13,100',
    tuitionNumeric: 13100,
    tuitionCurrency: 'EUR',
    applicationFee: 'EUR 50',
    expectedCommission: 'EUR 2,620 (20%)',
    commissionNumeric: 2620,
    intakes: ['Mar', 'Sep'],
    closedIntakes: [],
    applicationDeadline: 'Sep 2026: 15 July 2026',
    englishRequirements: {
      pteOverall: 59,
      pteNoBandLess: 52,
      toeflOverall: 84,
      toeflNoBandLess: 20,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 115,
      moiAccepted: true,
    },
    standardizedTests: 'GRE Not Required',
    entryRequirements: 'Bachelor’s degree in Computer Science, Engineering, Mathematics, or closely related quantitative field.',
    remarks: 'State-accredited German university. State-of-the-art AI GPU computing cluster for student thesis projects.',
    tags: ['STEM Programs', 'Faster Offer TAT', 'Top Ranked'],
  },
  {
    id: 'cf-7',
    university: 'Coventry University',
    logo: 'COV',
    logoColor: '#FF6F8E',
    country: 'United Kingdom',
    countryFlag: '🇬🇧',
    region: 'West Midlands, United Kingdom',
    campus: 'Coventry Main Campus',
    websiteUrl: 'https://www.coventry.ac.uk/international-students-hub/',
    portalUrl: 'https://www.ucas.com/explore/courses',
    fasterOfferTAT: false,
    affordable: false,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'MSc International Business Management',
    level: 'PG',
    studyArea: 'Commerce, Business and Administration',
    disciplineArea: 'International Strategy & Global Trade',
    duration: '12 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'GBP 18,600',
    tuitionNumeric: 18600,
    tuitionCurrency: 'GBP',
    applicationFee: 'No Application Fee',
    expectedCommission: 'GBP 2,790 (15%)',
    commissionNumeric: 2790,
    intakes: ['Jan', 'May', 'Sep'],
    closedIntakes: [],
    applicationDeadline: 'Sep 2026 / Jan 2027',
    englishRequirements: {
      pteOverall: 62,
      pteNoBandLess: 56,
      toeflOverall: 88,
      toeflNoBandLess: 21,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 120,
      moiAccepted: false,
    },
    standardizedTests: 'No GMAT / GRE Required',
    entryRequirements: '2:2 or equivalent undergraduate degree from a recognised university (minimum 55% aggregate).',
    remarks: 'UK Graduate Visa route allows 2 years post-study work. Dedicated student employability and placement team.',
    tags: ['Top Ranked', 'Scholarship Available'],
  },
  {
    id: 'cf-8',
    university: 'Coventry University',
    logo: 'COV',
    logoColor: '#FF6F8E',
    country: 'United Kingdom',
    countryFlag: '🇬🇧',
    region: 'West Midlands, United Kingdom',
    campus: 'Coventry Main Campus',
    websiteUrl: 'https://www.coventry.ac.uk',
    portalUrl: 'https://www.ucas.com',
    fasterOfferTAT: false,
    affordable: false,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'BEng (Hons) Automotive and Mechanical Engineering',
    level: 'UG',
    studyArea: 'Engineering and Engineering Trades',
    disciplineArea: 'Mechanical & Vehicle Systems',
    duration: '36 months',
    durationYears: '2 - 3 Years',
    yearlyTuition: 'GBP 17,400',
    tuitionNumeric: 17400,
    tuitionCurrency: 'GBP',
    applicationFee: 'No Application Fee',
    expectedCommission: 'GBP 2,610 (15%)',
    commissionNumeric: 2610,
    intakes: ['Sep'],
    closedIntakes: ['Jan'],
    applicationDeadline: 'Sep 2026 Intake',
    englishRequirements: {
      pteOverall: 59,
      pteNoBandLess: 52,
      toeflOverall: 82,
      toeflNoBandLess: 19,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 5.5,
      detScore: 110,
      moiAccepted: false,
    },
    standardizedTests: 'No SAT / ACT required',
    entryRequirements: 'Grade 12 with minimum 65% including Mathematics and Physics.',
    remarks: 'Formula Student racing team sponsorship and Jaguar Land Rover partnership links.',
    tags: ['STEM Programs', 'Top Ranked'],
  },
  {
    id: 'cf-9',
    university: 'University of Hertfordshire',
    logo: 'UH',
    logoColor: '#FFB020',
    country: 'United Kingdom',
    countryFlag: '🇬🇧',
    region: 'Hatfield, Hertfordshire, UK',
    campus: 'College Lane Campus',
    websiteUrl: 'https://www.herts.ac.uk/international',
    portalUrl: 'https://www.ucas.com',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'MSc Artificial Intelligence and Robotics',
    level: 'PG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Robotics & Autonomous Intelligence',
    duration: '12 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'GBP 16,500',
    tuitionNumeric: 16500,
    tuitionCurrency: 'GBP',
    applicationFee: 'No Application Fee',
    expectedCommission: 'GBP 2,475 (15%)',
    commissionNumeric: 2475,
    intakes: ['Jan', 'Sep'],
    closedIntakes: [],
    applicationDeadline: 'Jan 2027: 15 Nov 2026',
    englishRequirements: {
      pteOverall: 59,
      pteNoBandLess: 51,
      toeflOverall: 80,
      toeflNoBandLess: 18,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 115,
      moiAccepted: true,
    },
    standardizedTests: 'No GRE Required',
    entryRequirements: 'Bachelor’s in computing, engineering, or related discipline with minimum 55%.',
    remarks: 'Just 25 minutes by train to Central London. High visa clearance track record.',
    tags: ['Faster Offer TAT', 'STEM Programs'],
  },
  {
    id: 'cf-10',
    university: 'University of North Texas (UNT)',
    logo: 'UNT',
    logoColor: '#00F296',
    country: 'United States of America',
    countryFlag: '🇺🇸',
    region: 'Denton, Texas, USA',
    campus: 'Denton Main Campus',
    websiteUrl: 'https://international.unt.edu',
    portalUrl: 'https://educationusa.state.gov/',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'MS in Computer Science (STEM Designated)',
    level: 'PG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Data Systems & Cyber Security',
    duration: '24 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'USD 16,800',
    tuitionNumeric: 16800,
    tuitionCurrency: 'USD',
    applicationFee: 'USD 75',
    expectedCommission: 'USD 2,016 (12%)',
    commissionNumeric: 2016,
    intakes: ['Jan', 'Aug'],
    closedIntakes: [],
    applicationDeadline: 'Fall (Aug): April 15, Spring (Jan): Oct 15',
    englishRequirements: {
      pteOverall: 53,
      pteNoBandLess: 48,
      toeflOverall: 79,
      toeflNoBandLess: 18,
      ieltsOverall: 6.0,
      ieltsNoBandLess: 6.0,
      detScore: 105,
      moiAccepted: false,
    },
    standardizedTests: 'GRE Optional for candidates with GPA >= 3.0',
    entryRequirements: '4-year Bachelor degree (or 3-year Bologna compliant) with minimum 60% aggregate.',
    remarks: 'Qualifies for 3-Year OPT (STEM extension). In-state tuition waiver scholarship opportunities available.',
    tags: ['STEM Programs', 'OPT 3-Years', 'Faster Offer TAT'],
  },
  {
    id: 'cf-11',
    university: 'Griffith University',
    logo: 'GRI',
    logoColor: '#F472B6',
    country: 'Australia',
    countryFlag: '🇦🇺',
    region: 'Queensland, Australia',
    campus: 'Gold Coast Campus',
    websiteUrl: 'https://www.griffith.edu.au/international',
    portalUrl: 'https://www.studyaustralia.gov.au/en/study/course-search',
    fasterOfferTAT: false,
    affordable: false,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'Master of Information Technology',
    level: 'PG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Cloud Computing & Software Architecture',
    duration: '24 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'AUD 36,500',
    tuitionNumeric: 36500,
    tuitionCurrency: 'AUD',
    applicationFee: 'AUD 50 (Waiver via Sterling)',
    expectedCommission: 'AUD 4,380 (12%)',
    commissionNumeric: 4380,
    intakes: ['Mar', 'Jul', 'Nov'],
    closedIntakes: [],
    applicationDeadline: 'Trimester 1: Jan 30, Trimester 2: May 30',
    englishRequirements: {
      pteOverall: 58,
      pteNoBandLess: 50,
      toeflOverall: 79,
      toeflNoBandLess: 19,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 110,
      moiAccepted: false,
    },
    standardizedTests: 'No GRE required',
    entryRequirements: 'Recognised Bachelor’s degree in any field (converts non-IT backgrounds).',
    remarks: 'Regional Australia post-study work visa bonus points eligible on Gold Coast campus.',
    tags: ['Regional Visa Bonus', 'Scholarship Available'],
  },
  {
    id: 'cf-12',
    university: 'National College of Ireland (NCI)',
    logo: 'NCI',
    logoColor: '#38BDF8',
    country: 'Ireland',
    countryFlag: '🇮🇪',
    region: 'Dublin, Ireland',
    campus: 'IFSC Dublin City Campus',
    websiteUrl: 'https://www.ncirl.ie/International',
    portalUrl: 'https://www.educationinireland.com/',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: true,
    programName: 'MSc in Cloud Computing',
    level: 'PG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Cloud Infrastructure & DevOps',
    duration: '12 months',
    durationYears: '1 - 2 Years',
    yearlyTuition: 'EUR 15,000',
    tuitionNumeric: 15000,
    tuitionCurrency: 'EUR',
    applicationFee: 'No Application Fee',
    expectedCommission: 'EUR 2,250 (15%)',
    commissionNumeric: 2250,
    intakes: ['Jan', 'Sep'],
    closedIntakes: [],
    applicationDeadline: 'Sep 2026: 30 June 2026',
    englishRequirements: {
      pteOverall: 60,
      pteNoBandLess: 55,
      toeflOverall: 86,
      toeflNoBandLess: 20,
      ieltsOverall: 6.5,
      ieltsNoBandLess: 6.0,
      detScore: 115,
      moiAccepted: true,
    },
    standardizedTests: 'No GRE required',
    entryRequirements: 'Honours Bachelor degree in Computing or related area with 55% or above.',
    remarks: 'Located in Dublin Financial Centre next to Google, Meta, and AWS European HQs. 2-Year Irish Stay Back Visa.',
    tags: ['2-Year Stay Back', 'Faster Offer TAT', 'Tech Hub'],
  },
  {
    id: 'cf-13',
    university: 'Vilnius University',
    logo: 'VU',
    logoColor: '#A78BFA',
    country: 'Lithuania',
    countryFlag: '🇱🇹',
    region: 'Vilnius, Lithuania',
    campus: 'Old Town Campus',
    websiteUrl: 'https://www.vu.lt/en/studies',
    portalUrl: 'https://www.studyin.lt/',
    fasterOfferTAT: true,
    affordable: true,
    highAcceptance: true,
    scholarshipAvailable: false,
    programName: 'Bachelor of Software Engineering',
    level: 'UG',
    studyArea: 'Computer Science and Information Technology',
    disciplineArea: 'Full-Stack & Systems Programming',
    duration: '48 months',
    durationYears: '4 and above Years',
    yearlyTuition: 'EUR 3,800',
    tuitionNumeric: 3800,
    tuitionCurrency: 'EUR',
    applicationFee: 'EUR 100',
    expectedCommission: 'EUR 600 (Fixed)',
    commissionNumeric: 600,
    intakes: ['Sep'],
    closedIntakes: ['Feb'],
    applicationDeadline: 'June 1, 2026',
    englishRequirements: {
      pteOverall: 50,
      pteNoBandLess: 44,
      toeflOverall: 72,
      toeflNoBandLess: 16,
      ieltsOverall: 5.5,
      ieltsNoBandLess: 5.0,
      detScore: 95,
      moiAccepted: true,
    },
    standardizedTests: 'No SAT required',
    entryRequirements: 'Secondary education certificate with good grades in Mathematics and English.',
    remarks: 'One of the oldest universities in Central Europe (est. 1579). European Schengen visa & resident permit included.',
    tags: ['Affordable University', 'Schengen Residency'],
  },
];

// ============================================================================
// VERIFIED OFFICIAL COUNTRY RESEARCH PORTALS (Built-in + User Custom Links)
// ============================================================================
const DEFAULT_COUNTRY_PORTALS = [
  {
    id: 'cp-malta',
    country: 'Malta',
    flag: '🇲🇹',
    title: 'Study in Malta (Official Government Portal)',
    url: 'https://studyinmalta.biz',
    description: 'Official national portal for higher education, visa regulations, and approved colleges in Malta.',
  },
  {
    id: 'cp-malta-gbs',
    country: 'Malta',
    flag: '🇲🇹',
    title: 'GBS Malta Official Course Catalog',
    url: 'https://gbs.edu.mt/courses/',
    description: 'Direct institutional portal for bachelor, master, and English language programs in St. Julian’s.',
  },
  {
    id: 'cp-germany-daad',
    country: 'Germany',
    flag: '🇩🇪',
    title: 'DAAD International Programmes Search',
    url: 'https://www.daad.de/en/study-and-research-in-germany/courses-of-study-in-germany/all-study-programmes-in-germany/',
    description: 'German Academic Exchange Service directory covering 2,000+ English-taught degree courses in Germany.',
  },
  {
    id: 'cp-germany-uniassist',
    country: 'Germany',
    flag: '🇩🇪',
    title: 'Uni-Assist Application Evaluation',
    url: 'https://www.uni-assist.de/en/',
    description: 'Central service point for international student applications to German universities.',
  },
  {
    id: 'cp-germany-anabin',
    country: 'Germany',
    flag: '🇩🇪',
    title: 'Anabin Degree Recognition Database',
    url: 'https://anabin.kmk.org/',
    description: 'Verify institutional status (H+) and secondary school certificate equivalence (Abitur/HZB).',
  },
  {
    id: 'cp-uk-ucas',
    country: 'United Kingdom',
    flag: '🇬🇧',
    title: 'UCAS Explore Courses',
    url: 'https://www.ucas.com/explore/courses',
    description: 'UK central universities and colleges admissions service catalog across undergraduate and postgraduate.',
  },
  {
    id: 'cp-uk-gov',
    country: 'United Kingdom',
    flag: '🇬🇧',
    title: 'UKVI Student Visa Regulations',
    url: 'https://www.gov.uk/student-visa',
    description: 'Official UK Home Office guidelines on CAS, maintenance funds, and Graduate Route stay back.',
  },
  {
    id: 'cp-ireland-gov',
    country: 'Ireland',
    flag: '🇮🇪',
    title: 'Education in Ireland (Enterprise Ireland)',
    url: 'https://www.educationinireland.com/',
    description: 'National brand promoting Irish higher education institutions with verified ILEP accreditation.',
  },
  {
    id: 'cp-usa-edusa',
    country: 'United States of America',
    flag: '🇺🇸',
    title: 'EducationUSA (US Department of State)',
    url: 'https://educationusa.state.gov/',
    description: 'Official US network offering student advising, SEVIS guidelines, and F-1 visa preparation.',
  },
  {
    id: 'cp-aus-gov',
    country: 'Australia',
    flag: '🇦🇺',
    title: 'Study Australia (Australian Trade Commission)',
    url: 'https://www.studyaustralia.gov.au/en/study/course-search',
    description: 'Comprehensive Australian Government course search, CRICOS registered providers, and Subclass 500 visa rules.',
  },
  {
    id: 'cp-can-gov',
    country: 'Canada',
    flag: '🇨🇦',
    title: 'EduCanada & DLI Directory',
    url: 'https://www.educanada.ca/',
    description: 'Official Canadian portal for tuition fee estimations, study permits, and Designated Learning Institutions.',
  },
  {
    id: 'cp-lith-gov',
    country: 'Lithuania',
    flag: '🇱🇹',
    title: 'Study in Lithuania Official Portal',
    url: 'https://www.studyin.lt/',
    description: 'State-administered portal listing university and college courses with European credit points (ECTS).',
  },
];

export default function CourseFinder({ setCurrentPage }) {
  const { user } = useAuth();

  // Storage state: Merged catalog (Default + User Uploaded)
  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_course_catalog');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load cached courses:', e);
    }
    return DEFAULT_COURSES;
  });

  // Country portals list
  const [countryPortals, setCountryPortals] = useState(() => {
    try {
      const saved = localStorage.getItem('sterling_country_portals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load cached country portals:', e);
    }
    return DEFAULT_COUNTRY_PORTALS;
  });

  // Sync back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sterling_course_catalog', JSON.stringify(courses));
    } catch (e) {
      console.warn('Local storage write warning:', e);
    }
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem('sterling_country_portals', JSON.stringify(countryPortals));
    } catch (e) {
      console.warn('Local storage write warning:', e);
    }
  }, [countryPortals]);

  // UI state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntakes, setSelectedIntakes] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2026/2027');
  const [selectedNationality, setSelectedNationality] = useState('India');
  const [selectedStudentState, setSelectedStudentState] = useState('');

  // Advanced Filters State (Images 2, 3, 4, 5)
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStudyArea, setSelectedStudyArea] = useState('All');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('All');
  const [selectedRequirements, setSelectedRequirements] = useState([]);

  // Selection & Actions
  const [selectedCourseIds, setSelectedCourseIds] = useState(new Set());
  const [activeCourseDetails, setActiveCourseDetails] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPortalsModal, setShowPortalsModal] = useState(false);
  const [showDownloadPrefModal, setShowDownloadPrefModal] = useState(false);
  const [showAddPortalModal, setShowAddPortalModal] = useState(false);

  // Quick Filters Active Flag
  const [quickFilter, setQuickFilter] = useState(null); // 'faster_tat' | 'scholarship' | 'high_acceptance'

  // Extract distinct filter options from current catalog
  const availableCountries = useMemo(() => {
    const list = Array.from(new Set(courses.map((c) => c.country).filter(Boolean))).sort();
    return ['All', ...list];
  }, [courses]);

  const availableStudyAreas = useMemo(() => {
    const list = Array.from(new Set(courses.map((c) => c.studyArea).filter(Boolean))).sort();
    return ['All', ...list];
  }, [courses]);

  // ============================================================================
  // FILTERING LOGIC
  // ============================================================================
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Text Search Query (Program or University)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inProg = c.programName?.toLowerCase().includes(q);
        const inUni = c.university?.toLowerCase().includes(q);
        const inCity = c.region?.toLowerCase().includes(q) || c.campus?.toLowerCase().includes(q);
        if (!inProg && !inUni && !inCity) return false;
      }

      // 2. Intake Filter
      if (selectedIntakes.length > 0) {
        const hasMatchingIntake = (c.intakes || []).some((itk) =>
          selectedIntakes.includes(itk)
        );
        if (!hasMatchingIntake) return false;
      }

      // 3. Country Filter
      if (selectedCountry !== 'All' && c.country !== selectedCountry) {
        return false;
      }

      // 4. Study Area Filter
      if (selectedStudyArea !== 'All' && c.studyArea !== selectedStudyArea) {
        return false;
      }

      // 5. Duration Filter
      if (selectedDuration !== 'All' && c.durationYears !== selectedDuration) {
        return false;
      }

      // 6. Program Level Multi-Checkboxes
      if (selectedLevels.length > 0) {
        if (!selectedLevels.includes(c.level)) return false;
      }

      // 7. Requirements Checkboxes
      if (selectedRequirements.length > 0) {
        for (const req of selectedRequirements) {
          if (req === 'PTE' && !(c.englishRequirements?.pteOverall > 0)) return false;
          if (req === 'IELTS' && !(c.englishRequirements?.ieltsOverall > 0)) return false;
          if (req === 'TOEFL iBT' && !(c.englishRequirements?.toeflOverall > 0)) return false;
          if (req === 'DET' && !(c.englishRequirements?.detScore > 0)) return false;
          if (req === 'Without English Proficiency' && !c.englishRequirements?.moiAccepted) return false;
          if (req === 'Scholarship Available' && !c.scholarshipAvailable) return false;
          if (req === 'STEM Programs' && !c.tags?.includes('STEM Programs')) return false;
          if (req === 'Application Fee Waiver (upto 100%)' && c.applicationFee !== 'No Application Fee') return false;
        }
      }

      // 8. Quick Filter Suggestions (Image 6 Bottom)
      if (quickFilter === 'faster_tat' && !c.fasterOfferTAT) return false;
      if (quickFilter === 'scholarship' && !c.scholarshipAvailable) return false;
      if (quickFilter === 'high_acceptance' && !c.highAcceptance) return false;

      return true;
    });
  }, [
    courses,
    searchQuery,
    selectedIntakes,
    selectedCountry,
    selectedStudyArea,
    selectedDuration,
    selectedLevels,
    selectedRequirements,
    quickFilter,
  ]);

  // Group filtered courses by University for cohesive UI layout
  const groupedByUniversity = useMemo(() => {
    const map = {};
    filteredCourses.forEach((c) => {
      if (!map[c.university]) {
        map[c.university] = {
          name: c.university,
          logo: c.logo || c.university.slice(0, 3).toUpperCase(),
          logoColor: c.logoColor || '#7C6FFF',
          country: c.country,
          countryFlag: c.countryFlag || '🌍',
          region: c.region || c.country,
          websiteUrl: c.websiteUrl,
          portalUrl: c.portalUrl,
          fasterOfferTAT: c.fasterOfferTAT,
          affordable: c.affordable,
          scholarshipAvailable: c.scholarshipAvailable,
          highAcceptance: c.highAcceptance,
          programs: [],
        };
      }
      map[c.university].programs.push(c);
    });
    return Object.values(map);
  }, [filteredCourses]);

  // Handle Select All / Deselect All
  const toggleSelectCourse = (id) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allIds = filteredCourses.map((c) => c.id);
    setSelectedCourseIds(new Set(allIds));
    toast.success(`Selected all ${allIds.length} programs`);
  };

  const handleDeselectAll = () => {
    setSelectedCourseIds(new Set());
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedIntakes([]);
    setSelectedCountry('All');
    setSelectedStudyArea('All');
    setSelectedDuration('All');
    setSelectedLevels([]);
    setSelectedRequirements([]);
    setSelectedProvince('');
    setSelectedDiscipline('');
    setQuickFilter(null);
    toast('Filters reset to default', { icon: '🔄' });
  };

  // ============================================================================
  // EXPORT & DOWNLOAD HANDLER
  // ============================================================================
  const executeDownload = ({ format, scope, selectedColumns }) => {
    let dataset = [];
    if (scope === 'selected') {
      dataset = courses.filter((c) => selectedCourseIds.has(c.id));
      if (dataset.length === 0) dataset = filteredCourses;
    } else if (scope === 'top25') {
      dataset = filteredCourses.slice(0, 25);
    } else {
      dataset = filteredCourses;
    }

    if (dataset.length === 0) {
      toast.error('No courses to export with current filters');
      return;
    }

    // Build row objects based on column preferences
    const exportRows = dataset.map((c, idx) => {
      const row = {};
      row['#'] = idx + 1;
      if (selectedColumns.university) row['University / Institution'] = c.university;
      if (selectedColumns.program) row['Program Title'] = c.programName;
      if (selectedColumns.level) row['Degree Level'] = c.level;
      if (selectedColumns.country) row['Country'] = c.country;
      if (selectedColumns.campus) row['Campus / Region'] = c.region || c.campus;
      if (selectedColumns.duration) row['Duration'] = c.duration;
      if (selectedColumns.tuition) row['Yearly Tuition Fee'] = c.yearlyTuition;
      if (selectedColumns.applicationFee) row['Application Fee'] = c.applicationFee;
      if (selectedColumns.commission) row['Expected Commission'] = c.expectedCommission;
      if (selectedColumns.intakes) row['Open Intakes'] = (c.intakes || []).join(', ');
      if (selectedColumns.englishReqs) {
        row['English Proficiency'] = `IELTS: ${c.englishRequirements?.ieltsOverall || 'N/A'}, PTE: ${c.englishRequirements?.pteOverall || 'N/A'}, DET: ${c.englishRequirements?.detScore || 'N/A'}`;
      }
      if (selectedColumns.entryCriteria) row['Entry Requirements'] = c.entryRequirements || '';
      if (selectedColumns.websiteUrl) row['Official Link'] = c.websiteUrl || '';
      return row;
    });

    try {
      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Courses');

      // Auto-fit column widths
      const colWidths = Object.keys(exportRows[0] || {}).map((key) => ({
        wch: Math.max(key.length + 3, 14),
      }));
      worksheet['!cols'] = colWidths;

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Sterling_Course_Finder_${scope}_${dateStr}.${format === 'csv' ? 'csv' : 'xlsx'}`;

      if (format === 'csv') {
        XLSX.writeFile(workbook, filename, { bookType: 'csv' });
      } else {
        XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
      }

      toast.success(`Downloaded ${dataset.length} courses to ${filename}`);
      setShowDownloadPrefModal(false);
    } catch (err) {
      console.error('Download export failed:', err);
      toast.error('Failed to export courses: ' + err.message);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1680px',
        margin: '0 auto',
        padding: '16px 24px 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#080A12',
        color: '#EDEFFA',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      {/* =========================================================================
          TOP COMMAND BAR & STATS HEADER
         ========================================================================= */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          background: 'rgba(15, 20, 35, 0.85)',
          border: '1px solid rgba(148, 163, 225, 0.14)',
          borderRadius: '14px',
          padding: '14px 20px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Left: Summary Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Programs Available
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#36D1DC', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span>{courses.length}</span>
              <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 600 }}>({filteredCourses.length} filtered)</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div>
            <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Partner Universities
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#00E5A0' }}>
              {groupedByUniversity.length}
            </div>
          </div>

          <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.1)' }} />

          <div>
            <div style={{ fontSize: '10px', color: '#8E9BB5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
              Countries
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#A78BFA' }}>
              {availableCountries.length - 1}
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Official Country Research Portals Button */}
          <button
            onClick={() => setShowPortalsModal(true)}
            style={{
              background: 'rgba(124, 111, 255, 0.12)',
              border: '1px solid rgba(124, 111, 255, 0.35)',
              color: '#A78BFA',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title="Access verified country education portals and embassy research links"
          >
            <span>🌐</span>
            <span>Country Research Websites</span>
          </button>

          {/* Upload Course Data (Excel / CSV) */}
          <button
            onClick={() => setShowUploadModal(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(0, 229, 160, 0.18) 0%, rgba(54, 209, 220, 0.18) 100%)',
              border: '1px solid rgba(0, 229, 160, 0.45)',
              color: '#00E5A0',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 229, 160, 0.15)',
            }}
            title="Upload custom Excel or CSV files with smart column header mapping"
          >
            <span>📥</span>
            <span>Upload Course Data (Excel)</span>
          </button>

          {/* Reset / Clear Uploads */}
          <button
            onClick={() => {
              if (window.confirm('Reset catalog to default and clear any uploaded spreadsheet courses?')) {
                localStorage.removeItem('sterling_course_catalog');
                setCourses(DEFAULT_COURSES);
                toast.success('Course catalog reset to verified default!');
              }
            }}
            style={{
              background: 'rgba(255, 75, 107, 0.12)',
              border: '1px solid rgba(255, 75, 107, 0.35)',
              color: '#FF6B8B',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Clear uploaded spreadsheet courses and restore default catalog"
          >
            <span>🔄</span>
            <span>Reset Catalog</span>
          </button>

          {/* Download Filtered Excel */}
          <button
            onClick={() => setShowDownloadPrefModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#EDEFFA',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Download course catalog with custom column preferences"
          >
            <span>📊</span>
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRIMARY SEARCH STRIP (Exact Match to Image 2 Top Section)
         ========================================================================= */}
      <div
        style={{
          background: 'rgba(15, 20, 35, 0.85)',
          border: '1px solid rgba(148, 163, 225, 0.14)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1fr 1.5fr 1.5fr auto', gap: '10px', alignItems: 'flex-end' }}>
          {/* 1. Search Program / University */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Search Programs
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8E9BB5' }}>
                🏛️
              </span>
              <input
                type="text"
                placeholder="Search Program / University..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(8, 10, 18, 0.9)',
                  border: '1px solid rgba(148, 163, 225, 0.22)',
                  borderRadius: '10px',
                  padding: '9px 12px 9px 36px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* 2. Intake */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Intake
            </label>
            <select
              value={selectedIntakes[0] || 'All'}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedIntakes(val === 'All' ? [] : [val]);
              }}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.22)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#EDEFFA',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="All">All Intakes (Jan - Dec)</option>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                <option key={m} value={m}>{m} Intake</option>
              ))}
            </select>
          </div>

          {/* 3. Year */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.22)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#EDEFFA',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="2026">2026</option>
              <option value="2026/2027">2026 / 2027</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>

          {/* 4. Student Nationality */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Student's Nationality
            </label>
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.22)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#EDEFFA',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="India">🇮🇳 India</option>
              <option value="Nepal">🇳🇵 Nepal</option>
              <option value="Bangladesh">🇧🇩 Bangladesh</option>
              <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
              <option value="Nigeria">🇳🇬 Nigeria</option>
              <option value="Other">🌍 International / Other</option>
            </select>
          </div>

          {/* 5. Student's State */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Student's State
            </label>
            <input
              type="text"
              placeholder="e.g. Kerala, Punjab..."
              value={selectedStudentState}
              onChange={(e) => setSelectedStudentState(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.22)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* 6. Search & Clear Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                toast.success(`Found ${filteredCourses.length} matching programs`);
              }}
              style={{
                background: '#1D4ED8',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Search</span>
              <span>🔍</span>
            </button>

            <button
              onClick={clearAllFilters}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#8E9BB5',
                borderRadius: '10px',
                padding: '9px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Clear all filters"
            >
              Clear All ↺
            </button>
          </div>
        </div>

        {/* Advanced Search Toggle Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
          <button
            onClick={() => setShowAdvancedSearch((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '6px',
            }}
          >
            <span>{showAdvancedSearch ? '▲ Hide Advanced Search' : '▼ Advanced Search (Program Level, Countries, Exam Waivers)'}</span>
          </button>
        </div>

        {/* =======================================================================
            ADVANCED SEARCH 3-COLUMN PANEL (Exact Match to Images 2, 3, 4, 5)
           ======================================================================= */}
        {showAdvancedSearch && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.3fr 1.5fr',
              gap: '20px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(148, 163, 225, 0.12)',
              marginTop: '4px',
            }}
          >
            {/* COLUMN 1: Program Level */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Program Level
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  paddingRight: '6px',
                }}
              >
                {[
                  { id: 'UG', label: 'UG (Bachelor’s Degree)' },
                  { id: 'PG', label: 'PG (Master’s / MBA)' },
                  { id: 'UG Diploma', label: 'UG Diploma / Associate Degree' },
                  { id: 'PG Diploma', label: 'PG Diploma / Certificate' },
                  { id: 'PhD', label: 'PhD / Doctorate' },
                  { id: 'Pathway UG', label: 'Pathway Programs (UG)' },
                  { id: 'Pathway PG', label: 'Pathway Programs (PG)' },
                  { id: 'English Prep', label: 'English Language Program (ELP)' },
                  { id: 'Online', label: 'Online Programmes / Distance' },
                  { id: 'Hybrid', label: 'Hybrid Programmes' },
                  { id: 'Summer', label: 'Short-term / Summer Programs' },
                  { id: 'High School', label: 'High School (11th - 12th)' },
                ].map((lvl) => {
                  const isChecked = selectedLevels.includes(lvl.id);
                  return (
                    <label
                      key={lvl.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: isChecked ? '#fff' : '#A8B2C7',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedLevels((prev) =>
                            prev.includes(lvl.id) ? prev.filter((x) => x !== lvl.id) : [...prev, lvl.id]
                          );
                        }}
                        style={{ accentColor: '#38BDF8', width: '15px', height: '15px' }}
                      />
                      <span>{lvl.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: Other Filters (Country, Study Area, Duration) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
                Other Filters
              </div>

              {/* Country Select (Image 3) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(8, 10, 18, 0.9)',
                    border: '1px solid rgba(148, 163, 225, 0.22)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#EDEFFA',
                    fontSize: '12.5px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c === 'All' ? 'Select Country (All)' : c}</option>
                  ))}
                </select>
              </div>

              {/* Study Area Select (Image 4) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
                  Study Area
                </label>
                <select
                  value={selectedStudyArea}
                  onChange={(e) => setSelectedStudyArea(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(8, 10, 18, 0.9)',
                    border: '1px solid rgba(148, 163, 225, 0.22)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#EDEFFA',
                    fontSize: '12.5px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableStudyAreas.map((sa) => (
                    <option key={sa} value={sa}>{sa === 'All' ? 'Select Study Area (All)' : sa}</option>
                  ))}
                </select>
              </div>

              {/* Duration Select (Image 5) */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
                  Duration
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(8, 10, 18, 0.9)',
                    border: '1px solid rgba(148, 163, 225, 0.22)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#EDEFFA',
                    fontSize: '12.5px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="All">Select Duration (All)</option>
                  <option value="0 - 1 Years">0 - 1 Years</option>
                  <option value="1 - 2 Years">1 - 2 Years</option>
                  <option value="2 - 3 Years">2 - 3 Years</option>
                  <option value="3 - 4 Years">3 - 4 Years</option>
                  <option value="4 and above Years">4 and above Years</option>
                </select>
              </div>
            </div>

            {/* COLUMN 3: Requirements & Waivers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Requirements & Waivers
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                }}
              >
                {[
                  'IELTS',
                  'PTE',
                  'TOEFL iBT',
                  'DET',
                  'Without English Proficiency',
                  'Without GRE',
                  'Without GMAT',
                  'Without Maths',
                  'STEM Programs',
                  'Scholarship Available',
                  'Application Fee Waiver (upto 100%)',
                  'Open Programs',
                ].map((req) => {
                  const isChecked = selectedRequirements.includes(req);
                  return (
                    <label
                      key={req}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        color: isChecked ? '#00E5A0' : '#A8B2C7',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedRequirements((prev) =>
                            prev.includes(req) ? prev.filter((x) => x !== req) : [...prev, req]
                          );
                        }}
                        style={{ accentColor: '#00E5A0', width: '14px', height: '14px' }}
                      />
                      <span>{req}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          UNIVERSITY & COURSE CARDS (Exact Layout Matching Image 6)
         ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {groupedByUniversity.length === 0 ? (
          <div
            style={{
              background: 'rgba(15, 20, 35, 0.85)',
              border: '1px solid rgba(148, 163, 225, 0.14)',
              borderRadius: '14px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>
              No Programs Found Matching Your Query
            </div>
            <p style={{ fontSize: '13px', color: '#8E9BB5', maxWidth: '420px', margin: '0 auto 16px' }}>
              Try broadening your filters, or upload your university spreadsheet to ingest more country programs.
            </p>
            <button
              onClick={clearAllFilters}
              style={{
                background: '#1D4ED8',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          groupedByUniversity.map((uni) => (
            <div
              key={uni.name}
              style={{
                background: 'rgba(15, 20, 35, 0.85)',
                border: '1px solid rgba(148, 163, 225, 0.14)',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              }}
            >
              {/* University Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Monogram / Logo Badge */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${uni.logoColor}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 900,
                      color: uni.logoColor,
                      boxShadow: `0 0 16px ${uni.logoColor}20`,
                    }}
                  >
                    {uni.logo}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                        {uni.name}
                      </h3>
                      {uni.portalUrl && (
                        <a
                          href={uni.portalUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '11px',
                            color: '#38BDF8',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                          title="Open official country study portal"
                        >
                          <span>Official Portal ↗</span>
                        </a>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#8E9BB5', marginTop: '3px' }}>
                      <span>{uni.region}</span>
                      <span>{uni.countryFlag}</span>
                    </div>
                  </div>
                </div>

                {/* University Highlights Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {uni.fasterOfferTAT && (
                    <span
                      style={{
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38BDF8',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      ⚡ Faster Offer TAT
                    </span>
                  )}
                  {uni.affordable && (
                    <span
                      style={{
                        background: 'rgba(0, 229, 160, 0.12)',
                        border: '1px solid rgba(0, 229, 160, 0.3)',
                        color: '#00E5A0',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      🌿 Affordable University
                    </span>
                  )}
                  {uni.scholarshipAvailable && (
                    <span
                      style={{
                        background: 'rgba(167, 139, 250, 0.12)',
                        border: '1px solid rgba(167, 139, 250, 0.3)',
                        color: '#A78BFA',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      🎓 Scholarship Available
                    </span>
                  )}
                </div>
              </div>

              {/* Programs List inside this University (Matching Image 6 Cards) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {uni.programs.map((prog) => {
                  const isSelected = selectedCourseIds.has(prog.id);
                  return (
                    <div
                      key={prog.id}
                      style={{
                        background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(8, 10, 18, 0.65)',
                        border: isSelected ? '1px solid #38BDF8' : '1px solid rgba(148, 163, 225, 0.12)',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Program Title Row with Checkbox & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectCourse(prog.id)}
                            style={{ accentColor: '#38BDF8', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span
                            onClick={() => setActiveCourseDetails(prog)}
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: '#fff',
                              cursor: 'pointer',
                              transition: 'color 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#38BDF8')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                          >
                            {prog.programName}
                          </span>
                        </div>

                        {/* Intake Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {(prog.intakes || []).map((itk) => (
                            <span
                              key={itk}
                              style={{
                                background: 'rgba(0, 229, 160, 0.12)',
                                color: '#00E5A0',
                                border: '1px solid rgba(0, 229, 160, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              Open {itk} ℹ
                            </span>
                          ))}
                          {(prog.closedIntakes || []).map((itk) => (
                            <span
                              key={itk}
                              style={{
                                background: 'rgba(255, 111, 142, 0.12)',
                                color: '#FF6F8E',
                                border: '1px solid rgba(255, 111, 142, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              Closed {itk} ℹ
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Program Metrics Grid (Duration, Tuition, App Fee, Commission) */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr) auto',
                          gap: '12px',
                          alignItems: 'center',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '10.5px', color: '#8E9BB5', fontWeight: 600 }}>Duration</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#EDEFFA' }}>{prog.duration}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10.5px', color: '#8E9BB5', fontWeight: 600 }}>Tuition/yr</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fff' }}>
                            {prog.yearlyTuition} <span style={{ color: '#38BDF8', fontSize: '10px' }}>ℹ</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10.5px', color: '#8E9BB5', fontWeight: 600 }}>Application Fee</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#EDEFFA' }}>{prog.applicationFee}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: '10.5px', color: '#8E9BB5', fontWeight: 600 }}>Expected Commission</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#00E5A0' }}>
                            {prog.expectedCommission} <span style={{ fontSize: '10px' }}>ℹ</span>
                          </div>
                        </div>

                        {/* Quick View Button */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setActiveCourseDetails(prog)}
                            style={{
                              background: 'rgba(124, 111, 255, 0.15)',
                              border: '1px solid rgba(124, 111, 255, 0.3)',
                              color: '#A78BFA',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            View Details ↗
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* =========================================================================
          QUICK FILTERS SUGGESTIONS (Exact Match to Image 6 Bottom Carousel)
         ========================================================================= */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '10px' }}>
          Quick Filters Suggestions:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {/* Card 1: Faster Offer TAT */}
          <div
            onClick={() => setQuickFilter((prev) => (prev === 'faster_tat' ? null : 'faster_tat'))}
            style={{
              background: quickFilter === 'faster_tat' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(15, 20, 35, 0.85)',
              border: quickFilter === 'faster_tat' ? '1px solid #38BDF8' : '1px solid rgba(148, 163, 225, 0.14)',
              borderRadius: '12px',
              padding: '14px 18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
                {quickFilter === 'faster_tat' ? 'Active ✓' : 'View Universities →'}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>Faster Offer TAT</div>
            <div style={{ fontSize: '11px', color: '#8E9BB5', marginTop: '2px' }}>Decision on application within 2 weeks.</div>
          </div>

          {/* Card 2: Scholarship Available */}
          <div
            onClick={() => setQuickFilter((prev) => (prev === 'scholarship' ? null : 'scholarship'))}
            style={{
              background: quickFilter === 'scholarship' ? 'rgba(167, 139, 250, 0.16)' : 'rgba(15, 20, 35, 0.85)',
              border: quickFilter === 'scholarship' ? '1px solid #A78BFA' : '1px solid rgba(148, 163, 225, 0.14)',
              borderRadius: '12px',
              padding: '14px 18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              <span style={{ fontSize: '11px', color: '#A78BFA', fontWeight: 700 }}>
                {quickFilter === 'scholarship' ? 'Active ✓' : 'View Universities →'}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>Scholarship Available</div>
            <div style={{ fontSize: '11px', color: '#8E9BB5', marginTop: '2px' }}>Merit / Early Bird / Bursary Scholarships up to 33%.</div>
          </div>

          {/* Card 3: High Offer Acceptance Rate */}
          <div
            onClick={() => setQuickFilter((prev) => (prev === 'high_acceptance' ? null : 'high_acceptance'))}
            style={{
              background: quickFilter === 'high_acceptance' ? 'rgba(0, 229, 160, 0.16)' : 'rgba(15, 20, 35, 0.85)',
              border: quickFilter === 'high_acceptance' ? '1px solid #00E5A0' : '1px solid rgba(148, 163, 225, 0.14)',
              borderRadius: '12px',
              padding: '14px 18px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <span style={{ fontSize: '11px', color: '#00E5A0', fontWeight: 700 }}>
                {quickFilter === 'high_acceptance' ? 'Active ✓' : 'View Universities →'}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>High Offer Acceptance Rate</div>
            <div style={{ fontSize: '11px', color: '#8E9BB5', marginTop: '2px' }}>Programs with high offer conversion & smooth visa path.</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          FLOATING BOTTOM ACTION BAR (Exact Match to Image 6 Bottom Pill)
         ========================================================================= */}
      {selectedCourseIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 20, 35, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
            zIndex: 999,
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
            {selectedCourseIds.size} Program{selectedCourseIds.size > 1 ? 's' : ''} selected
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255, 255, 255, 0.15)' }} />

          <button
            onClick={handleDeselectAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8E9BB5',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✕ Deselect All
          </button>

          <button
            onClick={() => setShowDownloadPrefModal(true)}
            style={{
              background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📥 Download Excel</span>
          </button>

          <button
            onClick={() => executeDownload({
              format: 'xlsx',
              scope: 'top25',
              selectedColumns: {
                university: true,
                program: true,
                level: true,
                country: true,
                duration: true,
                tuition: true,
                applicationFee: true,
                commission: true,
                intakes: true,
                englishReqs: true,
                entryCriteria: true,
                websiteUrl: true,
              },
            })}
            style={{
              background: 'rgba(0, 229, 160, 0.15)',
              border: '1px solid rgba(0, 229, 160, 0.4)',
              color: '#00E5A0',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Download Top 25</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: PROGRAM DETAILS (Exact Match to Image 7)
         ========================================================================= */}
      {activeCourseDetails && (
        <ProgramDetailsModal
          course={activeCourseDetails}
          onClose={() => setActiveCourseDetails(null)}
          onApplyStudent={(prog) => {
            setActiveCourseDetails(null);
            if (setCurrentPage) {
              setCurrentPage('students');
              toast.success(`Navigating to register student for ${prog.programName}`);
            }
          }}
        />
      )}

      {/* =========================================================================
          MODAL 2: SMART EXCEL / CSV UPLOADER WITH COLUMN MAPPER
         ========================================================================= */}
      {showUploadModal && (
        <ExcelCourseUploaderModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onCoursesImported={(newCourses, mode = 'merge') => {
            if (mode === 'replace') {
              setCourses(newCourses);
              toast.success(`Catalog updated with ${newCourses.length} courses from your spreadsheet!`);
            } else {
              setCourses((prev) => [...newCourses, ...prev]);
              toast.success(`Successfully imported ${newCourses.length} courses into Sterling Course Finder!`);
            }
            setShowUploadModal(false);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 3: COUNTRY RESEARCH PORTALS HUB & CUSTOM SITES (User Requirement)
         ========================================================================= */}
      {showPortalsModal && (
        <CountryPortalsModal
          isOpen={showPortalsModal}
          onClose={() => setShowPortalsModal(false)}
          portals={countryPortals}
          onOpenAddPortal={() => setShowAddPortalModal(true)}
        />
      )}

      {/* =========================================================================
          MODAL 4: ADD CUSTOM COUNTRY RESEARCH PORTAL LINK
         ========================================================================= */}
      {showAddPortalModal && (
        <AddCustomPortalModal
          isOpen={showAddPortalModal}
          onClose={() => setShowAddPortalModal(false)}
          onAddPortal={(newPortal) => {
            setCountryPortals((prev) => [newPortal, ...prev]);
            toast.success(`Connected new research website for ${newPortal.country}!`);
            setShowAddPortalModal(false);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 5: CUSTOM DOWNLOAD PREFERENCES (User Requirement)
         ========================================================================= */}
      {showDownloadPrefModal && (
        <DownloadPreferencesModal
          isOpen={showDownloadPrefModal}
          onClose={() => setShowDownloadPrefModal(false)}
          selectedCount={selectedCourseIds.size}
          totalFiltered={filteredCourses.length}
          onConfirm={executeDownload}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: PROGRAM DETAILS MODAL (Matching Image 7 View)
// ============================================================================
function ProgramDetailsModal({ course, onClose, onApplyStudent }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          backgroundColor: '#0F1423',
          border: '1px solid rgba(148, 163, 225, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '18px' }}>{course.countryFlag || '🌍'}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8' }}>
                {course.university} &mdash; {course.region || course.country}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: 0 }}>
              {course.programName}
            </h2>
            {course.websiteUrl && (
              <a
                href={course.websiteUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '11px',
                  color: '#38BDF8',
                  textDecoration: 'underline',
                  marginTop: '4px',
                  display: 'inline-block',
                }}
              >
                {course.websiteUrl}
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#8E9BB5',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Program Details Grid (Image 7 Top Section) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(148, 163, 225, 0.12)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '14px' }}>
              PROGRAM DETAILS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Duration</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{course.duration}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Campus</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{course.campus || 'Main Campus'}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Intakes</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {(course.intakes || []).join(', ') || 'Rolling'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Application Deadline</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#A78BFA', marginTop: '2px' }}>
                  {course.applicationDeadline || 'Check Portal'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Application Fee</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#00E5A0', marginTop: '2px' }}>{course.applicationFee}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Yearly Tuition Fee</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>{course.yearlyTuition}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Expected Commission</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#00E5A0', marginTop: '2px' }}>{course.expectedCommission}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8E9BB5' }}>Degree Level</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>{course.level}</div>
              </div>
            </div>
          </div>

          {/* Section 2: English Proficiency Test Requirements (Image 7 Middle Table) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(148, 163, 225, 0.12)',
              borderRadius: '10px',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '14px' }}>
              ENGLISH PROFICIENCY TEST REQUIREMENTS
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>PTE Overall</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.pteOverall || '50'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>PTE No Bands Less Than</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.pteNoBandLess || '42'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>TOEFL iBT Overall</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.toeflOverall || '76'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>TOEFL iBT No Bands Less Than</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.toeflNoBandLess || '19'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>IELTS Overall</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#00E5A0' }}>{course.englishRequirements?.ieltsOverall || '6.0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>IELTS No Band Less Than</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.ieltsNoBandLess || '5.5'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>DET (Duolingo Score)</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{course.englishRequirements?.detScore || '105'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#8E9BB5' }}>MOI Accepted</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: course.englishRequirements?.moiAccepted ? '#00E5A0' : '#FF6F8E' }}>
                  {course.englishRequirements?.moiAccepted ? 'Yes (Terms Apply)' : 'No'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Standardized Tests & Entry Requirements */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(148, 163, 225, 0.12)',
                borderRadius: '10px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '8px' }}>
                STANDARDIZED TEST REQUIREMENTS
              </div>
              <div style={{ fontSize: '12.5px', color: '#EDEFFA', lineHeight: 1.5 }}>
                {course.standardizedTests || 'No Standardized Test Required (SAT/ACT/GRE/GMAT Waived).'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(148, 163, 225, 0.12)',
                borderRadius: '10px',
                padding: '16px 20px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '8px' }}>
                ENTRY REQUIREMENTS
              </div>
              <div style={{ fontSize: '12.5px', color: '#EDEFFA', lineHeight: 1.5 }}>
                {course.entryRequirements || 'Recognised secondary or undergraduate diploma with minimum 50%.'}
              </div>
            </div>
          </div>

          {/* Section 4: Remarks */}
          <div
            style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '10px',
              padding: '14px 18px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em', marginBottom: '6px' }}>
              REMARKS & COUNSELOR ADVISORY
            </div>
            <div style={{ fontSize: '12px', color: '#EDEFFA', lineHeight: 1.6 }}>
              {course.remarks || 'Tuition fees are subject to change semester-wise. Students must fulfill university admission interview requirements.'}
            </div>
          </div>
        </div>

        {/* Modal Footer with Direct Actions */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(8, 10, 18, 0.6)',
          }}
        >
          {course.websiteUrl ? (
            <a
              href={course.websiteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Visit Respective University Website ↗</span>
            </a>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#EDEFFA',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <button
              onClick={() => onApplyStudent(course)}
              style={{
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                border: 'none',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              + Register Student for Course
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GLOBAL COUNTRY METADATA & INTELLIGENT AUTO-DETECTION ENGINE
// ============================================================================
const STUDY_ABROAD_COUNTRIES = [
  {
    name: 'Malta',
    flag: '🇲🇹',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'malta', 'valletta', 'st. julian', 'st julian', 'sliema', 'msida', 'birkirkara', 'naxxar',
      'gbs malta', 'global college malta', 'mcast', 'american university of malta', 'queen mary malta',
      'ascencia malta', 'domain academy', 'idea academy', 'eie institute', 'st martins', 'studyinmalta',
      'identity malta', 'central visa unit', 'maltese'
    ]
  },
  {
    name: 'Germany',
    flag: '🇩🇪',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'germany', 'deutschland', 'berlin', 'munich', 'münchen', 'frankfurt', 'hamburg', 'potsdam',
      'leipzig', 'cologne', 'köln', 'stuttgart', 'düsseldorf', 'bsbi', 'university of europe',
      'iu international', 'gisma', 'arden berlin', 'lancaster leipzig', 'daad', 'uni-assist',
      'anabin', 'aps certificate', 'blocked account', 'fintiba', 'coracle', 'expatrio'
    ]
  },
  {
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    keywords: [
      'united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'london', 'birmingham',
      'manchester', 'leeds', 'glasgow', 'edinburgh', 'liverpool', 'coventry', 'hertfordshire',
      'greenwich', 'anglia ruskin', 'west london', 'teesside', 'de montfort', 'cardiff', 'ulster',
      'ucas', 'cas statement', 'graduate route', 'ukvi', 'gbp', '£'
    ]
  },
  {
    name: 'Ireland',
    flag: '🇮🇪',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'ireland', 'irish', 'dublin', 'cork', 'galway', 'limerick', 'maynooth', 'waterford',
      'nci', 'national college of ireland', 'griffith college', 'dbs', 'dublin business school',
      'trinity college', 'ucd', 'dcu', 'ucc', 'nuig', 'tud', 'inis', 'stamp 1g'
    ]
  },
  {
    name: 'Lithuania',
    flag: '🇱🇹',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'lithuania', 'lietuva', 'vilnius', 'kaunas', 'klaipeda', 'klaipėda', 'siauliai',
      'lsmu', 'lithuanian university of health sciences', 'vilnius university', 'vgtu', 'vilnius tech',
      'ktu', 'kaunas university of technology', 'mru', 'mykolas romeris', 'vytautas magnus', 'vdu',
      'skvc', 'migris', 'lithuanian'
    ]
  },
  {
    name: 'France',
    flag: '🇫🇷',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'france', 'french', 'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg',
      'montpellier', 'bordeaux', 'lille', 'rennes', 'grenoble', 'skema', 'ieseg', 'emlyon',
      'kedge', 'neoma', 'audencia', 'essec', 'edhec', 'campus france'
    ]
  },
  {
    name: 'Poland',
    flag: '🇵🇱',
    currency: 'PLN',
    currencySymbol: 'zł',
    keywords: [
      'poland', 'polska', 'warsaw', 'warszawa', 'krakow', 'kraków', 'wroclaw', 'wrocław',
      'poznan', 'poznań', 'gdansk', 'gdańsk', 'lodz', 'łódź', 'vistula', 'lazarski', 'kozminski',
      'warsaw university', 'jagiellonian', 'polish'
    ]
  },
  {
    name: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD',
    currencySymbol: 'C$',
    keywords: [
      'canada', 'canadian', 'ontario', 'british columbia', 'alberta', 'quebec', 'manitoba', 'saskatchewan',
      'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'edmonton', 'fanshawe', 'conestoga',
      'seneca', 'humber', 'george brown', 'sheridan', 'centennial', 'algoma', 'cape breton',
      'ircc', 'sds', 'pgwp', 'cad', 'c$'
    ]
  },
  {
    name: 'United States of America',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    keywords: [
      'united states', 'usa', 'u.s.a', 'america', 'new york', 'california', 'texas', 'florida',
      'boston', 'chicago', 'los angeles', 'san francisco', 'seattle', 'i-20', 'sevis', 'opt', 'cpt',
      'f-1 visa'
    ]
  },
  {
    name: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    currencySymbol: 'A$',
    keywords: [
      'australia', 'australian', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'gold coast',
      'canberra', 'cricos', 'gsr', 'genuine student', 'subclass 500', 'pswv', 'aud', 'a$'
    ]
  },
  {
    name: 'New Zealand',
    flag: '🇳🇿',
    currency: 'NZD',
    currencySymbol: 'NZ$',
    keywords: [
      'new zealand', 'nz', 'auckland', 'wellington', 'christchurch', 'hamilton', 'otago', 'inz', 'nzd'
    ]
  },
  {
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    keywords: [
      'united arab emirates', 'uae', 'u.a.e', 'dubai', 'abu dhabi', 'sharjah', 'knowledge park',
      'dixc', 'academic city', 'murdoch dubai', 'curtin dubai', 'middlesex dubai', 'heriot watt dubai',
      'aed', 'dirham'
    ]
  },
  {
    name: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    currencySymbol: 'S$',
    keywords: [
      'singapore', 'psb academy', 'kaplan singapore', 'sim global education', 'jcu singapore',
      'curtin singapore', 'mdis', 'sgd', 's$'
    ]
  },
  {
    name: 'Malaysia',
    flag: '🇲🇾',
    currency: 'MYR',
    currencySymbol: 'RM',
    keywords: [
      'malaysia', 'kuala lumpur', 'selangor', 'penang', 'taylors', 'sunway', 'monash malaysia',
      'nottingham malaysia', 'curtin malaysia', 'emgs', 'myr', 'ringgit'
    ]
  },
  {
    name: 'Italy',
    flag: '🇮🇹',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'italy', 'italia', 'rome', 'roma', 'milan', 'milano', 'florence', 'firenze', 'bologna', 'turin',
      'torino', 'naba', 'ied', 'marangoni', 'politecnico di milano', 'universitaly', 'dsu scholarship'
    ]
  },
  {
    name: 'Spain',
    flag: '🇪🇸',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'spain', 'españa', 'madrid', 'barcelona', 'valencia', 'seville', 'granada', 'malaga',
      'ie university', 'esade', 'ucam', 'eada', 'nebrija', 'spanish'
    ]
  },
  {
    name: 'Netherlands',
    flag: '🇳🇱',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'netherlands', 'holland', 'dutch', 'amsterdam', 'rotterdam', 'utrecht', 'the hague', 'eindhoven',
      'groningen', 'maastricht', 'studielink'
    ]
  },
  {
    name: 'Hungary',
    flag: '🇭🇺',
    currency: 'HUF',
    currencySymbol: 'Ft',
    keywords: [
      'hungary', 'budapest', 'debrecen', 'szeged', 'pecs', 'pécs', 'corvinus', 'semmelweis',
      'stipendium hungaricum', 'forint', 'huf'
    ]
  },
  {
    name: 'Czech Republic',
    flag: '🇨🇿',
    currency: 'CZK',
    currencySymbol: 'Kč',
    keywords: [
      'czech republic', 'czechia', 'prague', 'praha', 'brno', 'ostrava', 'charles university',
      'masaryk', 'czk'
    ]
  },
  {
    name: 'Switzerland',
    flag: '🇨🇭',
    currency: 'CHF',
    currencySymbol: 'CHF',
    keywords: [
      'switzerland', 'swiss', 'zurich', 'zürich', 'geneva', 'genève', 'lausanne', 'basel',
      'glion', 'les roches', 'ehl', 'bhms', 'chf'
    ]
  },
  {
    name: 'Austria',
    flag: '🇦🇹',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'austria', 'österreich', 'vienna', 'wien', 'salzburg', 'graz', 'innsbruck', 'modul university'
    ]
  },
  {
    name: 'Cyprus',
    flag: '🇨🇾',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'cyprus', 'nicosia', 'limassol', 'larnaca', 'paphos', 'university of nicosia', 'european university cyprus'
    ]
  },
  {
    name: 'Georgia',
    flag: '🇬🇪',
    currency: 'GEL',
    currencySymbol: '₾',
    keywords: [
      'georgia', 'tbilisi', 'batumi', 'kutaisi', 'ilia state', 'tbilisi state medical', 'geomedi',
      'caucasus university'
    ]
  },
  {
    name: 'Latvia',
    flag: '🇱🇻',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'latvia', 'riga', 'rīga', 'turiba', 'riga technical university', 'rtu', 'university of latvia'
    ]
  },
  {
    name: 'Finland',
    flag: '🇫🇮',
    currency: 'EUR',
    currencySymbol: '€',
    keywords: [
      'finland', 'helsinki', 'tampere', 'espoo', 'oulu', 'turku', 'aalto', 'lut university'
    ]
  },
  {
    name: 'Sweden',
    flag: '🇸🇪',
    currency: 'SEK',
    currencySymbol: 'kr',
    keywords: [
      'sweden', 'stockholm', 'gothenburg', 'göteborg', 'malmö', 'kth', 'chalmers', 'sek'
    ]
  },
];

// Helper to return exact country flag emoji
function getCountryFlag(countryName) {
  if (!countryName) return '🌍';
  const c = countryName.toLowerCase().trim();
  const found = STUDY_ABROAD_COUNTRIES.find(
    (def) => def.name.toLowerCase() === c || def.keywords.some((kw) => kw === c)
  );
  if (found) return found.flag;

  if (c.includes('malta')) return '🇲🇹';
  if (c.includes('germany') || c.includes('deutschland')) return '🇩🇪';
  if (c.includes('united kingdom') || c === 'uk' || c.includes('britain') || c.includes('england') || c.includes('scotland')) return '🇬🇧';
  if (c.includes('ireland')) return '🇮🇪';
  if (c.includes('lithuania')) return '🇱🇹';
  if (c.includes('france')) return '🇫🇷';
  if (c.includes('poland')) return '🇵🇱';
  if (c.includes('canada')) return '🇨🇦';
  if (c.includes('united states') || c === 'usa' || c === 'us' || c.includes('america')) return '🇺🇸';
  if (c.includes('australia')) return '🇦🇺';
  if (c.includes('new zealand')) return '🇳🇿';
  if (c.includes('united arab emirates') || c.includes('uae') || c.includes('dubai')) return '🇦🇪';
  if (c.includes('singapore')) return '🇸🇬';
  if (c.includes('malaysia')) return '🇲🇾';
  if (c.includes('italy')) return '🇮🇹';
  if (c.includes('spain')) return '🇪🇸';
  if (c.includes('netherlands') || c.includes('holland')) return '🇳🇱';
  if (c.includes('hungary')) return '🇭🇺';
  if (c.includes('czech')) return '🇨🇿';
  if (c.includes('switzerland')) return '🇨🇭';
  if (c.includes('austria')) return '🇦🇹';
  if (c.includes('cyprus')) return '🇨🇾';
  if (c.includes('georgia')) return '🇬🇪';
  if (c.includes('latvia')) return '🇱🇻';
  if (c.includes('finland')) return '🇫🇮';
  if (c.includes('sweden')) return '🇸🇪';
  return '🌍';
}

// AI Country Detection Engine
function detectCountryFromData(fileName = '', sheetName = '', grid = [], headers = [], rows = []) {
  const fileLower = (fileName || '').toLowerCase();
  const sheetLower = (sheetName || '').toLowerCase();

  // Combine words from headers and first 30 rows
  const textPool = [
    fileLower,
    sheetLower,
    ...(headers || []).map((h) => String(h || '').toLowerCase()),
    ...(grid || []).slice(0, 30).flat().map((c) => String(c ?? '').toLowerCase()),
  ].join(' ');

  let bestCountry = 'Malta';
  let bestScore = -1;
  let reason = 'Default European Hub';

  for (const c of STUDY_ABROAD_COUNTRIES) {
    let score = 0;
    let matchedReason = '';

    // Check file name match (Highest Weight)
    for (const kw of c.keywords) {
      if (fileLower.includes(kw)) {
        score += 30;
        matchedReason = `file name "${kw}"`;
        break;
      }
    }

    // Check sheet name match
    for (const kw of c.keywords) {
      if (sheetLower.includes(kw)) {
        score += 20;
        if (!matchedReason) matchedReason = `sheet name "${kw}"`;
        break;
      }
    }

    // Check text pool
    for (const kw of c.keywords) {
      if (textPool.includes(kw)) {
        score += 5;
        if (!matchedReason) matchedReason = `content match "${kw}"`;
      }
    }

    // Check specific currency clues
    if (c.currency === 'GBP' && textPool.includes('£')) score += 8;
    if (c.currency === 'CAD' && textPool.includes('cad')) score += 8;
    if (c.currency === 'AUD' && textPool.includes('aud')) score += 8;
    if (c.currency === 'AED' && (textPool.includes('aed') || textPool.includes('dirham'))) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestCountry = c.name;
      reason = matchedReason || `content clues`;
    }
  }

  return {
    country: bestCountry,
    flag: getCountryFlag(bestCountry),
    confidence: bestScore > 20 ? 'High' : bestScore > 5 ? 'Medium' : 'Default',
    reason,
  };
}

// ============================================================================
// SUB-COMPONENT: SMART EXCEL/CSV UPLOADER WITH COLUMN MAPPER & LIVE PREVIEW
// ============================================================================
function ExcelCourseUploaderModal({ isOpen, onClose, onCoursesImported }) {
  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  // 2D grid: array of arrays (rows)
  const [sheetGrid, setSheetGrid] = useState([]);
  const [candidateHeaderRows, setCandidateHeaderRows] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);

  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);

  // Country Selection & Intelligence
  const [selectedCountry, setSelectedCountry] = useState('Malta');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [forceCountryForAll, setForceCountryForAll] = useState(true);
  const [autoCountryInfo, setAutoCountryInfo] = useState({
    country: 'Malta',
    flag: '🇲🇹',
    confidence: 'Default',
    reason: '',
  });

  const [defaultUniversity, setDefaultUniversity] = useState('');
  const [importMode, setImportMode] = useState('merge'); // 'merge' | 'replace'

  const [columnMapping, setColumnMapping] = useState({
    university: '',
    programName: '',
    level: '',
    country: '',
    campus: '',
    duration: '',
    yearlyTuition: '',
    applicationFee: '',
    expectedCommission: '',
    intakes: '',
    requirements: '',
    englishRequirements: '',
    websiteUrl: '',
  });

  const [step, setStep] = useState('file'); // 'file' | 'mapping'

  // Computed destination country (either dropdown selection or typed custom name)
  const effectiveCountry = useMemo(() => {
    if (selectedCountry === 'CUSTOM') {
      return customCountryInput.trim() || 'Malta';
    }
    return selectedCountry || 'Malta';
  }, [selectedCountry, customCountryInput]);

  const effectiveCountryFlag = useMemo(() => {
    return getCountryFlag(effectiveCountry);
  }, [effectiveCountry]);

  // Apply a specific header row to the raw grid
  const applyHeaderRow = (grid, headerIdx, activeFileName = '', activeSheetName = '') => {
    if (!grid || grid.length <= headerIdx) return;

    const rawHeaderRow = grid[headerIdx] || [];
    // Clean and normalize header strings
    const headers = rawHeaderRow.map((cell, colIdx) => {
      const s = String(cell ?? '').replace(/[\r\n\t]+/g, ' ').trim();
      return s || `Column_${colIdx + 1}`;
    });

    // Build data rows starting from row immediately after header
    const rows = [];
    for (let r = headerIdx + 1; r < grid.length; r++) {
      const rowArr = grid[r] || [];
      const hasContent = rowArr.some((c) => String(c ?? '').trim().length > 0);
      if (!hasContent) continue;

      const obj = {};
      headers.forEach((h, colIdx) => {
        obj[h] = rowArr[colIdx] !== undefined ? String(rowArr[colIdx] ?? '').trim() : '';
      });
      rows.push(obj);
    }

    setDetectedHeaders(headers);
    setDataRows(rows);

    // Auto-match headers using comprehensive regexes
    const findHeader = (pattern, excludePattern = null) => {
      return (
        headers.find((h) => {
          if (!pattern.test(h)) return false;
          if (excludePattern && excludePattern.test(h)) return false;
          return true;
        }) || ''
      );
    };

    let progCol = findHeader(
      /course|program|programme|degree|qualification|specialization|discipline|major|stream|study\s*title/i,
      /fee|duration|level|intake|country|campus|requirement|ielts|pte/i
    );

    if (!progCol) {
      progCol = findHeader(
        /^(title|subject|name|course_name|programme_name|qualification\s*title)$/i,
        /university|institution|college|provider|student/i
      );
    }

    // Tertiary content fallback: if no header name matched, inspect actual row contents!
    if (!progCol && rows.length > 0) {
      const degreeWords = [
        'bachelor', 'master', 'bsc', 'msc', 'ba', 'ma', 'mba', 'diploma', 'engineering',
        'business', 'management', 'science', 'arts', 'computing', 'technology', 'health', 'finance', 'law'
      ];
      let bestContentCol = '';
      let bestContentScore = -1;
      for (const h of headers) {
        let sc = 0;
        for (let i = 0; i < Math.min(rows.length, 25); i++) {
          const val = String(rows[i]?.[h] || '').toLowerCase();
          for (const dw of degreeWords) {
            if (val.includes(dw)) sc += 2;
          }
        }
        if (sc > bestContentScore) {
          bestContentScore = sc;
          bestContentCol = h;
        }
      }
      if (bestContentScore > 0) {
        progCol = bestContentCol;
      }
    }

    const uniCol = findHeader(
      /university|institution|college|school|provider|institute|academy|awarding/i,
      /fee|duration|level/i
    );

    const countryCol = findHeader(/country|nation|destination/i);

    // Run AI Country Auto-Detection
    const aiCountry = detectCountryFromData(activeFileName, activeSheetName, grid, headers, rows);
    setAutoCountryInfo(aiCountry);
    setSelectedCountry(aiCountry.country);

    // If file has NO country column, enable forceCountryForAll by default
    if (!countryCol) {
      setForceCountryForAll(true);
    }

    // Suggest default university from file name if no university column in file
    if (!uniCol && activeFileName) {
      const cleanName = activeFileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b(courses|course|list|fee|fees|malta|germany|uk|erp|sterling|2026|2027)\b/gi, '')
        .trim();
      if (cleanName.length > 2) {
        setDefaultUniversity(cleanName);
      }
    }

    setColumnMapping({
      programName: progCol,
      university: uniCol,
      level: findHeader(/level|award|type|qualification/i, /fee|duration/i),
      country: countryCol,
      campus: findHeader(/campus|city|location|province|state|region/i),
      duration: findHeader(/duration|length|period|years|months|semesters|ects/i),
      yearlyTuition: findHeader(/tuition|fee|fees|cost|annual|yearly|price|amount/i, /app|application|reg/i),
      applicationFee: findHeader(/app\s*fee|application\s*fee|registration\s*fee/i),
      expectedCommission: findHeader(/commission|agent\s*fee|payout|incentive/i),
      intakes: findHeader(/intake|starts|session|terms|month/i),
      requirements: findHeader(/requirement|eligibility|criteria/i, /english|ielts|pte/i),
      englishRequirements: findHeader(/english|ielts|pte|toefl|language|moi/i),
      websiteUrl: findHeader(/website|url|link|portal/i),
    });
  };

  // Process raw worksheet
  const processWorksheet = (ws, fileName = '', sheetName = '') => {
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!grid || grid.length === 0) {
      toast.error('The selected sheet has no data');
      return;
    }

    setSheetGrid(grid);

    // Find candidate header rows
    const candidates = [];
    const keywords = [
      'course', 'programme', 'program', 'degree', 'title', 'name',
      'university', 'institution', 'college', 'tuition', 'fee', 'fees',
      'duration', 'intake', 'level', 'award', 'eligibility', 'requirement',
      'ielts', 'pte', 'ects', 'credits', 'campus', 'country', 'city', 'stream'
    ];

    let bestScore = -1;
    let autoHeaderIdx = 0;

    const maxScan = Math.min(grid.length, 15);
    for (let r = 0; r < maxScan; r++) {
      const rowArr = grid[r] || [];
      const cells = rowArr.map((c) => String(c ?? '').replace(/[\r\n\t]+/g, ' ').trim()).filter(Boolean);
      if (cells.length === 0) continue;

      let score = 0;
      for (const cell of cells) {
        const lower = cell.toLowerCase();
        for (const kw of keywords) {
          if (lower.includes(kw)) score += 3;
        }
      }
      if (cells.length >= 3) score += 2;
      if (cells.length >= 5) score += 2;

      candidates.push({
        index: r,
        label: `Row ${r + 1}: ${cells.slice(0, 4).join(' | ').slice(0, 55)}${cells.length > 4 ? '...' : ''}`,
        cellCount: cells.length,
        score,
      });

      if (score > bestScore) {
        bestScore = score;
        autoHeaderIdx = r;
      }
    }

    setCandidateHeaderRows(candidates);
    setHeaderRowIndex(autoHeaderIdx);
    applyHeaderRow(grid, autoHeaderIdx, fileName, sheetName);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setWorkbook(wb);
        setAvailableSheets(wb.SheetNames);

        // Pick best sheet
        const initialSheet = wb.SheetNames[0];
        setSelectedSheet(initialSheet);

        const ws = wb.Sheets[initialSheet];
        processWorksheet(ws, selectedFile.name, initialSheet);
        setStep('mapping');
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse spreadsheet: ' + err.message);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleSheetSwitch = (sheetName) => {
    if (!workbook || !workbook.Sheets[sheetName]) return;
    setSelectedSheet(sheetName);
    const ws = workbook.Sheets[sheetName];
    processWorksheet(ws, file?.name || '', sheetName);
  };

  const handleHeaderRowChange = (idx) => {
    setHeaderRowIndex(idx);
    applyHeaderRow(sheetGrid, idx, file?.name || '', selectedSheet);
  };

  // Real-time live preview of top 4 rows using current mapping and country resolution
  const previewRows = useMemo(() => {
    return dataRows.slice(0, 4).map((row, idx) => {
      // 1. Program Name
      let prog = columnMapping.programName ? String(row[columnMapping.programName] || '').trim() : '';
      if (!prog) {
        for (const k of Object.keys(row)) {
          const v = String(row[k] || '').trim();
          if (v.length >= 4 && /bachelor|master|bsc|msc|ba|ma|mba|diploma|business|computing|management|science|arts/i.test(v)) {
            prog = v;
            break;
          }
        }
      }
      if (!prog) {
        const textVals = Object.values(row).map((v) => String(v || '').trim()).filter((v) => v.length > 5 && isNaN(Number(v)));
        if (textVals.length > 0) prog = textVals[0];
      }

      // 2. University Name
      let uni = columnMapping.university ? String(row[columnMapping.university] || '').trim() : '';
      if (!uni) uni = defaultUniversity.trim() || 'Partner Institution';

      // 3. Country Resolution
      let ctry = '';
      if (!forceCountryForAll && columnMapping.country && row[columnMapping.country]) {
        ctry = String(row[columnMapping.country]).trim();
      }
      if (!ctry) {
        ctry = effectiveCountry;
      }
      const flag = getCountryFlag(ctry);

      // 4. Level
      let lvl = columnMapping.level ? String(row[columnMapping.level] || '').trim() : '';
      if (!lvl) {
        const lower = (prog || '').toLowerCase();
        if (lower.includes('master') || lower.includes('msc') || lower.includes('mba')) lvl = 'PG';
        else if (lower.includes('diploma')) lvl = 'Diploma';
        else lvl = 'UG';
      }

      // 5. Tuition
      let tFee = columnMapping.yearlyTuition ? String(row[columnMapping.yearlyTuition] || '').trim() : '';
      if (!tFee) tFee = 'EUR 6,000';

      // 6. Duration
      let dur = columnMapping.duration ? String(row[columnMapping.duration] || '').trim() : '';
      if (!dur) dur = '36 months';

      // 7. Intakes
      let itk = columnMapping.intakes ? String(row[columnMapping.intakes] || '').trim() : 'Sep, Jan';

      return {
        idx: idx + 1,
        ctry,
        flag,
        uni,
        prog: prog || '⚠️ Not detected',
        lvl,
        tFee,
        dur,
        itk,
        hasProg: Boolean(prog),
      };
    });
  }, [dataRows, columnMapping, defaultUniversity, effectiveCountry, forceCountryForAll]);

  // Final Ingestion with Robust Fallbacks
  const handleProcessImport = () => {
    if (dataRows.length === 0) {
      toast.error('No valid data rows found to import');
      return;
    }

    const imported = dataRows.map((row, idx) => {
      // 1. Program Name extraction with aggressive multi-layer fallbacks
      let prog = columnMapping.programName ? String(row[columnMapping.programName] || '').trim() : '';

      if (!prog) {
        for (const k of Object.keys(row)) {
          const v = String(row[k] || '').trim();
          if (v.length >= 4 && /bachelor|master|bsc|msc|ba|ma|mba|diploma|certificate|business|management|computing|engineering|science|arts|health|design|law/i.test(v)) {
            prog = v;
            break;
          }
        }
      }

      if (!prog) {
        const textCols = Object.values(row)
          .map((v) => String(v || '').trim())
          .filter((v) => v.length > 5 && isNaN(Number(v)) && !v.includes('http') && !v.includes('@'));
        if (textCols.length > 0) prog = textCols[0];
      }

      if (!prog) {
        prog = `Course #${idx + 1}`;
      }

      // 2. University extraction
      let uni = columnMapping.university ? String(row[columnMapping.university] || '').trim() : '';
      if (!uni) {
        uni = defaultUniversity.trim() || 'Partner Institution';
      }

      // 3. Country extraction (Respects Force Flag or Column Mapping)
      let ctry = '';
      if (!forceCountryForAll && columnMapping.country && row[columnMapping.country]) {
        ctry = String(row[columnMapping.country]).trim();
      }
      if (!ctry) {
        ctry = effectiveCountry;
      }
      const cFlag = getCountryFlag(ctry);

      // 4. Level extraction
      let lvl = columnMapping.level ? String(row[columnMapping.level] || '').trim() : '';
      if (!lvl) {
        const lowerProg = prog.toLowerCase();
        if (
          lowerProg.includes('master') ||
          lowerProg.includes('msc') ||
          lowerProg.includes('ma ') ||
          lowerProg.includes('mba') ||
          lowerProg.includes('postgraduate') ||
          lowerProg.includes('pg ')
        ) {
          lvl = 'PG';
        } else if (lowerProg.includes('phd') || lowerProg.includes('doctorate')) {
          lvl = 'PhD';
        } else if (lowerProg.includes('diploma') || lowerProg.includes('certificate')) {
          lvl = 'PG Diploma/Certificate';
        } else {
          lvl = 'UG';
        }
      }

      // 5. Duration
      let dur = columnMapping.duration ? String(row[columnMapping.duration] || '').trim() : '';
      if (!dur) {
        for (const k of Object.keys(row)) {
          const v = String(row[k] || '').trim();
          if (/\b(year|years|month|months|semester|semesters|ects)\b/i.test(v)) {
            dur = v;
            break;
          }
        }
      }
      if (!dur) dur = '36 months';

      // 6. Tuition Fee & Currency Detection
      let tFee = columnMapping.yearlyTuition ? String(row[columnMapping.yearlyTuition] || '').trim() : '';
      if (!tFee || tFee === '0') {
        for (const k of Object.keys(row)) {
          const v = String(row[k] || '').trim();
          if (/[€$£₹]|\bEUR\b|\bUSD\b|\bGBP\b|\bCAD\b|\bAUD\b|\bAED\b/i.test(v)) {
            tFee = v;
            break;
          }
        }
      }
      if (!tFee) {
        const defaultSym =
          ctry.includes('United Kingdom') || ctry === 'UK'
            ? 'GBP '
            : ctry.includes('Canada')
            ? 'CAD '
            : ctry.includes('Australia')
            ? 'AUD '
            : ctry.includes('United States')
            ? 'USD '
            : ctry.includes('United Arab Emirates')
            ? 'AED '
            : 'EUR ';
        tFee = `${defaultSym}6,000`;
      }

      // 7. Intakes
      const itkRaw = columnMapping.intakes ? String(row[columnMapping.intakes] || 'Sep, Jan').trim() : 'Sep, Jan';
      const intakes = itkRaw.split(/[,/|;]/).map((s) => s.trim()).filter(Boolean);

      // 8. Requirements & English
      const reqs = columnMapping.requirements ? String(row[columnMapping.requirements] || '').trim() : '';
      const engReqs = columnMapping.englishRequirements ? String(row[columnMapping.englishRequirements] || '').trim() : '';
      const appFee = columnMapping.applicationFee ? String(row[columnMapping.applicationFee] || 'No Application Fee').trim() : 'No Application Fee';
      const comm = columnMapping.expectedCommission ? String(row[columnMapping.expectedCommission] || 'Standard Agency Commission').trim() : 'Standard Agency Commission';
      const web = columnMapping.websiteUrl ? String(row[columnMapping.websiteUrl] || '').trim() : '';
      const campus = columnMapping.campus ? String(row[columnMapping.campus] || `${ctry} Campus`).trim() : `${ctry} Campus`;

      const tuitionNum = parseInt(tFee.replace(/\D/g, '')) || 6000;

      return {
        id: `import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        university: uni,
        logo: uni.slice(0, 3).toUpperCase(),
        logoColor: '#36D1DC',
        country: ctry,
        countryFlag: cFlag,
        region: campus,
        campus: campus,
        websiteUrl: web,
        portalUrl: '',
        fasterOfferTAT: true,
        affordable: tuitionNum < 10000,
        highAcceptance: true,
        scholarshipAvailable: reqs.toLowerCase().includes('scholarship') || tFee.toLowerCase().includes('scholarship'),
        programName: prog,
        level: lvl,
        studyArea: 'General Academic Studies',
        disciplineArea: 'Higher Education',
        duration: dur,
        durationYears: dur.includes('1') ? '1 - 2 Years' : dur.includes('2') ? '2 - 3 Years' : '3 - 4 Years',
        yearlyTuition: tFee,
        tuitionNumeric: tuitionNum,
        tuitionCurrency: tFee.includes('$')
          ? ctry.includes('Canada')
            ? 'CAD'
            : ctry.includes('Australia')
            ? 'AUD'
            : 'USD'
          : tFee.includes('£')
          ? 'GBP'
          : tFee.includes('AED')
          ? 'AED'
          : 'EUR',
        applicationFee: appFee,
        expectedCommission: comm,
        commissionNumeric: 800,
        intakes: intakes.length > 0 ? intakes : ['Sep', 'Jan'],
        closedIntakes: [],
        applicationDeadline: 'Rolling Admissions for Upcoming Intake',
        englishRequirements: {
          pteOverall: 52,
          pteNoBandLess: 42,
          toeflOverall: 76,
          toeflNoBandLess: 19,
          ieltsOverall: 6.0,
          ieltsNoBandLess: 5.5,
          detScore: 105,
          moiAccepted: true,
        },
        standardizedTests: 'Standard Entry Assessment',
        entryRequirements: reqs || '12 years secondary or equivalent bachelor degree.',
        remarks: engReqs ? `Language requirements: ${engReqs}` : `Imported for destination country ${cFlag} ${ctry}.`,
        tags: ['Custom Upload', ctry],
      };
    });

    onCoursesImported(imported, importMode);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '940px',
          maxHeight: '92vh',
          backgroundColor: '#0F1423',
          border: '1px solid rgba(0, 229, 160, 0.35)',
          borderRadius: '16px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.85)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(8, 10, 18, 0.5)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#00E5A0', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📥</span>
              <span>Upload Custom Course Spreadsheet</span>
            </h3>
            <p style={{ fontSize: '12px', color: '#8E9BB5', margin: '4px 0 0' }}>
              Smart multi-sheet parser with <strong>AI Country Detection</strong> and live preview before ingestion.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#8E9BB5',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {step === 'file' ? (
            <div
              style={{
                border: '2px dashed rgba(0, 229, 160, 0.35)',
                borderRadius: '12px',
                padding: '45px 20px',
                textAlign: 'center',
                background: 'rgba(0, 229, 160, 0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('cf-excel-upload-input')?.click()}
            >
              <div style={{ fontSize: '46px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                Click to Select or Drag Excel (.xlsx, .xls) / CSV File Here
              </div>
              <div style={{ fontSize: '12px', color: '#8E9BB5', maxWidth: '480px', margin: '0 auto' }}>
                Works with any country format. AI automatically detects the destination country or lets you pick/override it with 1 click.
              </div>
              <input
                id="cf-excel-upload-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* File Info Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <span style={{ fontSize: '14px', color: '#EDEFFA', fontWeight: 700 }}>
                    📄 {file?.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#00E5A0', marginLeft: '10px', fontWeight: 600 }}>
                    ({dataRows.length} course rows detected)
                  </span>
                </div>
                <button
                  onClick={() => setStep('file')}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Change File
                </button>
              </div>

              {/* =========================================================================
                  AI COUNTRY DETECTION & DESTINATION SELECTION CARD (CRITICAL USER FEATURE)
                 ========================================================================= */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 229, 160, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)',
                  border: '1px solid rgba(0, 229, 160, 0.35)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🌍</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#00E5A0', letterSpacing: '0.03em' }}>
                      STUDY ABROAD DESTINATION COUNTRY
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'rgba(0, 229, 160, 0.18)',
                        color: '#00E5A0',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        border: '1px solid rgba(0, 229, 160, 0.3)',
                      }}
                    >
                      ✨ AI Detected: {autoCountryInfo.flag} {autoCountryInfo.country} ({autoCountryInfo.reason})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: selectedCountry === 'CUSTOM' ? '1.5fr 1.5fr' : '1fr', gap: '12px' }}>
                  {/* Country Selector Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#EDEFFA', marginBottom: '6px' }}>
                      Select Target Country for this Spreadsheet
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(8, 10, 18, 0.95)',
                        border: '1px solid #00E5A0',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        color: '#00E5A0',
                        fontSize: '13px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    >
                      {STUDY_ABROAD_COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                      <option value="CUSTOM">➕ Other / Type Custom Country...</option>
                    </select>
                  </div>

                  {/* Custom Country Text Input */}
                  {selectedCountry === 'CUSTOM' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#38BDF8', marginBottom: '6px' }}>
                        Type Custom Country Name
                      </label>
                      <input
                        type="text"
                        value={customCountryInput}
                        onChange={(e) => setCustomCountryInput(e.target.value)}
                        placeholder="e.g. Switzerland, Mauritius, Japan..."
                        style={{
                          width: '100%',
                          background: 'rgba(8, 10, 18, 0.95)',
                          border: '1px solid #38BDF8',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Force Country Checkbox (For files without Country column) */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#EDEFFA',
                    cursor: 'pointer',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={forceCountryForAll}
                    onChange={(e) => setForceCountryForAll(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <span>
                    <strong>Apply {effectiveCountryFlag} {effectiveCountry} to ALL courses in this file</strong>{' '}
                    <span style={{ color: '#8E9BB5' }}>
                      (Recommended: ensures 100% accurate country filtering in Course Finder even if the spreadsheet has no Country column).
                    </span>
                  </span>
                </label>
              </div>

              {/* Sheet & Header Row Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: availableSheets.length > 1 ? '1fr 2fr' : '1fr', gap: '12px' }}>
                {availableSheets.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
                      Workbook Sheet
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetSwitch(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(8, 10, 18, 0.9)',
                        border: '1px solid rgba(148, 163, 225, 0.22)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      {availableSheets.map((s) => (
                        <option key={s} value={s}>
                          📑 {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#8E9BB5' }}>
                      Header Row in Spreadsheet
                    </label>
                    <span style={{ fontSize: '10px', color: '#00E5A0', fontWeight: 700 }}>
                      ✨ Auto-detected: Row {headerRowIndex + 1}
                    </span>
                  </div>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => handleHeaderRowChange(parseInt(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(8, 10, 18, 0.9)',
                      border: '1px solid rgba(0, 229, 160, 0.4)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#00E5A0',
                      fontSize: '12px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    {candidateHeaderRows.map((c) => (
                      <option key={c.index} value={c.index}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Default University Name Input */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
                  Default University / Institution Name (Used if no university column in file)
                </label>
                <input
                  type="text"
                  value={defaultUniversity}
                  onChange={(e) => setDefaultUniversity(e.target.value)}
                  placeholder="e.g. Global College Malta / GBS Malta / BSBI Berlin"
                  style={{
                    width: '100%',
                    background: 'rgba(8, 10, 18, 0.9)',
                    border: '1px solid rgba(148, 163, 225, 0.22)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Column Mapping Section */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#00E5A0', letterSpacing: '0.04em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span>
                  <span>MATCH SPREADSHEET COLUMNS TO COURSE FIELDS</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { key: 'programName', label: 'Program / Course Title * (Critical)', required: true },
                    { key: 'university', label: 'University / Institution Name' },
                    { key: 'country', label: 'Country Column (Optional if selected above)' },
                    { key: 'level', label: 'Degree Level (UG, PG, Diploma)' },
                    { key: 'yearlyTuition', label: 'Yearly Tuition Fee' },
                    { key: 'duration', label: 'Duration (e.g. 36 months, 3 yrs)' },
                    { key: 'intakes', label: 'Intakes / Start Dates' },
                    { key: 'campus', label: 'Campus / City / Province' },
                    { key: 'requirements', label: 'Entry Requirements / Eligibility' },
                    { key: 'englishRequirements', label: 'IELTS / PTE / English Test' },
                    { key: 'applicationFee', label: 'Application Fee' },
                    { key: 'expectedCommission', label: 'Expected Commission' },
                    { key: 'websiteUrl', label: 'Official Website / Course URL' },
                  ].map((field) => (
                    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: field.required ? '#00E5A0' : '#8E9BB5', fontWeight: 700 }}>
                        {field.label}
                      </span>
                      <select
                        value={columnMapping[field.key] || ''}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                        style={{
                          background: columnMapping[field.key] ? 'rgba(0, 229, 160, 0.08)' : 'rgba(8, 10, 18, 0.9)',
                          border: columnMapping[field.key] ? '1px solid #00E5A0' : '1px solid rgba(148, 163, 225, 0.2)',
                          color: columnMapping[field.key] ? '#00E5A0' : '#8E9BB5',
                          borderRadius: '8px',
                          padding: '7px 10px',
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      >
                        <option value="">-- Not in file / Auto fallback --</option>
                        {detectedHeaders.map((h) => {
                          const sampleVal = String(dataRows[0]?.[h] || '').slice(0, 25);
                          return (
                            <option key={h} value={h}>
                              {h} {sampleVal ? `(e.g. "${sampleVal}")` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* LIVE DATA PREVIEW TABLE (Shows exact country, flag, university, course names before import) */}
              <div
                style={{
                  background: 'rgba(8, 10, 18, 0.75)',
                  border: '1px solid rgba(148, 163, 225, 0.18)',
                  borderRadius: '12px',
                  padding: '14px',
                  marginTop: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.04em' }}>
                    🔍 LIVE DATA PREVIEW (First {previewRows.length} Rows with Current Mapping)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#00E5A0', fontWeight: 700 }}>
                      Country: {effectiveCountryFlag} {effectiveCountry}
                    </span>
                    {previewRows[0]?.hasProg ? (
                      <span style={{ fontSize: '11px', color: '#00E5A0', fontWeight: 700 }}>
                        ✓ Course Names Validated
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#FFB020', fontWeight: 700 }}>
                        ⚠️ Pick "Program Title"
                      </span>
                    )}
                  </div>
                </div>

                {!previewRows[0]?.hasProg && (
                  <div
                    style={{
                      background: 'rgba(255, 176, 32, 0.12)',
                      border: '1px solid rgba(255, 176, 32, 0.35)',
                      color: '#FFB020',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    ⚠️ <strong>Notice:</strong> Course Name column was not automatically identified. Please select your program name column from the dropdown above so your courses display their actual titles instead of defaults!
                  </div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#8E9BB5', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px', width: '30px' }}>#</th>
                        <th style={{ padding: '6px 8px', color: '#00E5A0' }}>Country</th>
                        <th style={{ padding: '6px 8px', color: '#EDEFFA' }}>University</th>
                        <th style={{ padding: '6px 8px', color: '#38BDF8' }}>Course / Program Name</th>
                        <th style={{ padding: '6px 8px' }}>Level</th>
                        <th style={{ padding: '6px 8px' }}>Tuition/Yr</th>
                        <th style={{ padding: '6px 8px' }}>Duration</th>
                        <th style={{ padding: '6px 8px' }}>Intakes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r) => (
                        <tr key={r.idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '6px 8px', color: '#8E9BB5' }}>{r.idx}</td>
                          <td style={{ padding: '6px 8px', color: '#00E5A0', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {r.flag} {r.ctry}
                          </td>
                          <td style={{ padding: '6px 8px', color: '#EDEFFA', fontWeight: 600 }}>{r.uni}</td>
                          <td style={{ padding: '6px 8px', color: r.hasProg ? '#38BDF8' : '#FFB020', fontWeight: 700 }}>
                            {r.prog}
                          </td>
                          <td style={{ padding: '6px 8px', color: '#EDEFFA' }}>{r.lvl}</td>
                          <td style={{ padding: '6px 8px', color: '#00E5A0' }}>{r.tFee}</td>
                          <td style={{ padding: '6px 8px', color: '#8E9BB5' }}>{r.dur}</td>
                          <td style={{ padding: '6px 8px', color: '#8E9BB5' }}>{r.itk}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Mode: Merge vs Replace */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                }}
              >
                <span style={{ fontSize: '11px', color: '#8E9BB5', fontWeight: 700 }}>Import Action:</span>
                <label style={{ fontSize: '12px', color: '#EDEFFA', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                  />
                  <span>Merge with existing course catalog</span>
                </label>
                <label style={{ fontSize: '12px', color: '#EDEFFA', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                  />
                  <span style={{ color: '#FFB020' }}>Replace entire catalog with this spreadsheet</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'rgba(8, 10, 18, 0.6)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#EDEFFA',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleProcessImport}
              style={{
                background: 'linear-gradient(135deg, #00E5A0, #00C885)',
                border: 'none',
                color: '#080A12',
                padding: '10px 26px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 229, 160, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🚀</span>
              <span>Import {dataRows.length} Courses to {effectiveCountryFlag} {effectiveCountry}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: COUNTRY RESEARCH PORTALS HUB MODAL (User Requirement)
// ============================================================================
function CountryPortalsModal({ isOpen, onClose, portals, onOpenAddPortal }) {
  const [filterCountry, setFilterCountry] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPortals = useMemo(() => {
    return portals.filter((p) => {
      if (filterCountry !== 'All' && p.country !== filterCountry) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.country.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [portals, filterCountry, searchTerm]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          backgroundColor: '#0F1423',
          border: '1px solid rgba(124, 111, 255, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#A78BFA', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🌐</span>
              <span>Official Country Research Websites & Portals</span>
            </h3>
            <p style={{ fontSize: '12px', color: '#8E9BB5', margin: '4px 0 0' }}>
              Connect directly with verified government portals, university databases, and visa guidance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onOpenAddPortal}
              style={{
                background: 'linear-gradient(135deg, #7C6FFF, #5B4FE0)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add Custom Country Website
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#8E9BB5',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search portal or country name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(8, 10, 18, 0.9)',
              border: '1px solid rgba(148, 163, 225, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '12.5px',
              outline: 'none',
            }}
          />

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            style={{
              background: 'rgba(8, 10, 18, 0.9)',
              border: '1px solid rgba(148, 163, 225, 0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Countries</option>
            {['Malta', 'Germany', 'United Kingdom', 'Ireland', 'United States of America', 'Australia', 'Canada', 'Lithuania'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Portals Grid */}
        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {filteredPortals.map((item) => (
            <div
              key={item.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(148, 163, 225, 0.12)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px' }}>{item.flag || '🌍'}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA' }}>{item.country}</span>
                </div>
                <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#fff', margin: 0 }}>{item.title}</h4>
                <p style={{ fontSize: '11.5px', color: '#8E9BB5', margin: '6px 0 0', lineHeight: 1.5 }}>
                  {item.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#64748B', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.url}
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Open Portal ↗</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: ADD CUSTOM PORTAL MODAL
// ============================================================================
function AddCustomPortalModal({ isOpen, onClose, onAddPortal }) {
  const [country, setCountry] = useState('Malta');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error('Please enter both Title and Website URL');
      return;
    }

    const newPortal = {
      id: `custom-portal-${Date.now()}`,
      country,
      flag: '🌍',
      title: title.trim(),
      url: url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`,
      description: description.trim() || `Official resource portal for ${country}.`,
    };

    onAddPortal(newPortal);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0F1423',
          border: '1px solid rgba(124, 111, 255, 0.35)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#A78BFA', margin: '0 0 16px' }}>
          Connect Official Country Website / Research Link
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
              Country
            </label>
            <input
              type="text"
              placeholder="e.g. Malta, Germany, France..."
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
              Website / Portal Title
            </label>
            <input
              type="text"
              placeholder="e.g. Malta Further & Higher Education Authority (MFHEA)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
              Official Website URL
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#8E9BB5', marginBottom: '4px' }}>
              Research Notes / Purpose
            </label>
            <textarea
              placeholder="Notes on accreditation, visa verification, or admissions guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                background: 'rgba(8, 10, 18, 0.9)',
                border: '1px solid rgba(148, 163, 225, 0.2)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#EDEFFA',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #7C6FFF, #5B4FE0)',
                border: 'none',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Website Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENT: DOWNLOAD PREFERENCES MODAL (User Requirement)
// ============================================================================
function DownloadPreferencesModal({ isOpen, onClose, selectedCount, totalFiltered, onConfirm }) {
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [scope, setScope] = useState(selectedCount > 0 ? 'selected' : 'all');
  const [selectedColumns, setSelectedColumns] = useState({
    university: true,
    program: true,
    level: true,
    country: true,
    campus: true,
    duration: true,
    tuition: true,
    applicationFee: true,
    commission: true,
    intakes: true,
    englishReqs: true,
    entryCriteria: true,
    websiteUrl: true,
  });

  const toggleCol = (k) => {
    setSelectedColumns((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#0F1423',
          border: '1px solid rgba(148, 163, 225, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
          Download Course Data Preferences
        </h3>
        <p style={{ fontSize: '12px', color: '#8E9BB5', margin: '0 0 16px' }}>
          Select your export format, scope, and specific fields to include.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Format Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              File Format
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                style={{
                  flex: 1,
                  background: format === 'xlsx' ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: format === 'xlsx' ? '1px solid #00E5A0' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: format === 'xlsx' ? '#00E5A0' : '#8E9BB5',
                  padding: '9px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📊 Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat('csv')}
                style={{
                  flex: 1,
                  background: format === 'csv' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: format === 'csv' ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: format === 'csv' ? '#38BDF8' : '#8E9BB5',
                  padding: '9px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                📄 CSV (.csv)
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Export Scope
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  style={{
                    flex: 1,
                    background: scope === 'selected' ? 'rgba(124, 111, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: scope === 'selected' ? '1px solid #7C6FFF' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: scope === 'selected' ? '#A78BFA' : '#8E9BB5',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Selected ({selectedCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setScope('all')}
                style={{
                  flex: 1,
                  background: scope === 'all' ? 'rgba(124, 111, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: scope === 'all' ? '1px solid #7C6FFF' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: scope === 'all' ? '#A78BFA' : '#8E9BB5',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                All Filtered ({totalFiltered})
              </button>
              <button
                type="button"
                onClick={() => setScope('top25')}
                style={{
                  flex: 1,
                  background: scope === 'top25' ? 'rgba(124, 111, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: scope === 'top25' ? '1px solid #7C6FFF' : '1px solid rgba(255, 255, 255, 0.12)',
                  color: scope === 'top25' ? '#A78BFA' : '#8E9BB5',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Top 25
              </button>
            </div>
          </div>

          {/* Columns Checklist */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8E9BB5', marginBottom: '6px' }}>
              Columns to Include in Spreadsheet
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {[
                { k: 'university', label: 'University / Institution' },
                { k: 'program', label: 'Program Title' },
                { k: 'level', label: 'Degree Level' },
                { k: 'country', label: 'Country' },
                { k: 'campus', label: 'Campus / Region' },
                { k: 'duration', label: 'Duration' },
                { k: 'tuition', label: 'Yearly Tuition Fee' },
                { k: 'applicationFee', label: 'Application Fee' },
                { k: 'commission', label: 'Expected Commission' },
                { k: 'intakes', label: 'Intakes' },
                { k: 'englishReqs', label: 'English Test Scores' },
                { k: 'entryCriteria', label: 'Entry Requirements' },
                { k: 'websiteUrl', label: 'Official Research Link' },
              ].map((c) => (
                <label key={c.k} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#EDEFFA', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!selectedColumns[c.k]}
                    onChange={() => toggleCol(c.k)}
                    style={{ accentColor: '#00E5A0', width: '14px', height: '14px' }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#EDEFFA',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm({ format, scope, selectedColumns })}
            style={{
              background: 'linear-gradient(135deg, #00E5A0, #00C885)',
              border: 'none',
              color: '#080A12',
              padding: '8px 22px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Generate & Download 📥
          </button>
        </div>
      </div>
    </div>
  );
}
