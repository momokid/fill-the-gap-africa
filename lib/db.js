'use strict';

/**
 * Storage layer.
 *
 * Uses SQLite compiled to WebAssembly (sql.js) so the app has no native
 * dependencies and can run on any shared host. The database is kept in memory
 * and written atomically to data/site.db after every mutation.
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');
const config = require('../config');

let db = null;
let dbFile = null;

/* -------------------------------------------------------------------------- */
/* Defaults                                                                    */
/* -------------------------------------------------------------------------- */

const SETTING_DEFAULTS = {
  site_name: 'Fill The Gap Africa',
  site_tagline: 'Closing the gap between talent and opportunity.',
  site_description:
    'Fill The Gap Africa is a women-led Ghanaian non-profit working across education, enterprise, health and climate.',

  topbar_text: 'Accra, Ghana — women-led, community-rooted since 2011',
  footer_tagline:
    'A women-led Ghanaian non-profit closing the gap between talent and opportunity.',
  legal_text: 'Fill The Gap Africa is a registered non-profit organization in Ghana.',

  hero_eyebrow: 'Women-led Ghanaian NGO · Est. 2011',
  hero_title: 'We close <em>the gap</em> between talent and opportunity.',
  hero_lede:
    'Fill The Gap Africa works alongside underserved communities in Ghana — advancing girls’ education, women’s enterprise, dependable healthcare and a fairer green economy.',
  hero_cta_label: 'Support our work',
  hero_cta_url: '/donate',
  hero_cta2_label: 'Explore our programs',
  hero_cta2_url: '/programs',
  hero_quote: 'When women rise, communities thrive.',
  hero_quote_author: 'Dr. Vida Kabuga Akekodaga, Founder & Executive Director',
  hero_stat_value: '70% → 1%',
  hero_stat_label: 'Child marriage in Katiu Saa, through community by-laws',
  hero_image: '/img/photos/hero-bg.jpg',
  hero_image_2: '/img/photos/hero-side.jpg',
  logo: '/img/ftga-logo.png',

  stat_1_value: '2011',
  stat_1_label: 'Founded in Accra, Ghana',
  stat_2_value: '200+',
  stat_2_label: 'Women trained in financial literacy and enterprise',
  stat_3_value: '250',
  stat_3_label: 'Girls returned to school with CAMFED Ghana',
  stat_4_value: '1',
  stat_4_label: 'School and CHPS health compound built with Katiu Saa',

  cta_title: 'The gap closes when we move together.',
  cta_body:
    'Give, volunteer your expertise, or partner with us on a program. Every contribution is directed by the community it serves.',
  cta_primary_label: 'Donate',
  cta_primary_url: '/donate',
  cta_secondary_label: 'Partner with us',
  cta_secondary_url: '/get-involved',

  contact_address: 'HP8V+X3\nAccra, Greater Accra Region\nGhana',
  contact_phone: '+233 24 483 6281',
  contact_email: 'info@fillthegapafrica.org',
  donate_email: 'donate@fillthegapafrica.org',

  font_body: 'inter',
  font_heading: 'intertight',
  font_base: '16',
  color_brand: '#0f6d9f',
  color_brand_dark: '#0b5b86',
  color_cta: '#c10211',
  color_cta_dark: '#9d010d',
  container_width: '1200',
  section_spacing: '88',
  radius: '10',

  show_stats: '1',
  show_mission: '1',
  show_programs: '1',
  show_approach: '1',
  show_story: '1',
  show_partners: '1',
  show_news: '1',
  show_events: '1',
  show_cta: '1',

  admin_path: '/ftga-studio',

  stats_label: 'By the numbers',
  stats_meta: 'Accra, Ghana · 2011 to today',
  mission_kicker: 'The gap',
  mission_title: 'Where a girl is born should not decide how far she can <em>go</em>.',
  mission_lede: 'Across Ghana, talent is everywhere. Opportunity is not. A girl can face a marriage instead of a classroom. A woman can run a thriving trade with no access to finance. A family can live hours from basic care.',
  mission_body: 'Fill The Gap Africa exists to change that equation, not with handouts, but with local leadership, practical training and partnerships that outlast us. Founded in Accra in 2011 and led by women, we work where the gap is widest.',
  programs_kicker: 'What we do',
  programs_title: 'Four programs. <em>One</em> purpose.',
  programs_note: 'Education, enterprise, health and climate are not separate problems. They are the same family, seen from four angles.',
  approach_kicker: 'How we work',
  approach_title: 'Slow to start. <em>Hard</em> to stop.',
  approach_note: 'Programs that survive an election cycle, a funding gap and a bad harvest are built differently from programs designed for a photograph.',
  story_kicker: 'From the field',
  story_title: 'By-laws, <em>not</em> charity.',
  partners_title: 'Partners & supporters',
  partners_note: 'We work with institutions that stay, and with the communities that hold us to account.',
  news_kicker: 'Field notes',
  news_title: 'What we are <em>learning</em>.',
  news_note: 'Updates from the communities we work with, and notes on what is working, and what is not.',
  events_kicker: 'What’s next',
  events_title: 'Come <em>see</em> the work.',
  events_note: 'Screening days, graduations and community events. Everyone is welcome.',
  contact_hours: 'Monday–Friday, 8:30–17:00 GMT',
  contact_note: 'We reply to every message within two business days.',
  contact_map: '1',

  social_facebook: 'https://web.facebook.com/profile.php?id=61560412077986',
  social_instagram: '',
  social_linkedin: '',
  social_x: '',
  social_youtube: '',

  /* --- Homepage blocks ---------------------------------------------------- */
  story_place: 'Katiu Saa · Greater Accra',
  story_tag: 'Field story',
  story_lede:
    'In Katiu Saa, the change did not begin with a donation. It began with a meeting: community leaders, women’s groups and our team looking at what was happening to girls, and deciding to write their own rules.',
  story_body:
    'Those by-laws protect a girl’s right to stay in school. Child marriage fell from roughly 70% to 1%. Girls returned to classrooms, teenage pregnancy declined, and families began to treat school as the better investment.',
  story_link_label: 'Read the field notes',
  story_link_url: '/stories',

  home_facts: JSON.stringify([
    { label: 'Founded', value: '2011, Accra, Ghana' },
    { label: 'Focus', value: 'Education · Enterprise · Health · Climate' },
    { label: 'Led by', value: 'Women, alongside community partners' }
  ]),

  approach_steps: JSON.stringify([
    {
      title: 'Listen first',
      text: 'Every program starts with months of conversation with community leaders, women’s groups and local government, not a pre-written project plan.'
    },
    {
      title: 'Build practical capability',
      text: 'Training is hands-on. A trader leaves with a costed business plan. A student leaves with a study routine and a mentor who checks in.'
    },
    {
      title: 'Stay accountable',
      text: 'Every program has a named community lead, a simple scorecard and an annual public update.'
    }
  ]),

  story_points: JSON.stringify([
    { text: 'By-laws written and enforced by the community itself' },
    { text: 'A school and a CHPS health compound built with the community' },
    { text: 'Girls re-enrolled with mentors who check in every term' }
  ]),

  /* --- About page --------------------------------------------------------- */
  about_values_kicker: 'What we believe',
  about_values_title: 'Four rules we do not <em>bend</em>.',
  about_values_note:
    'These are not decorations on a wall. They decide which programs we start, which we stop, and who gets to be in the room.',
  about_facts_title: 'At a glance',
  about_team_kicker: 'The team',
  about_team_title: 'Women who <em>stay</em>.',
  about_team_note:
    'A small team in Accra, supported by community leads in every place we work. Our programs are run by the people who live there.',

  about_values: JSON.stringify([
    { title: 'Community first', text: 'Communities set the agenda. We bring resources, structure and staying power.' },
    { title: 'Women at the center', text: 'Women lead our organization and make up most of the people we serve.' },
    { title: 'Evidence and accountability', text: 'We measure what changes, report what does not, and adjust in public.' },
    { title: 'Partnership over duplication', text: 'We strengthen local institutions instead of building parallel ones.' }
  ]),

  about_photos: JSON.stringify([
    { image: '/img/photos/strip-water.jpg', alt: 'Children collecting water in a partner community' },
    { image: '/img/photos/strip-clinic.jpg', alt: 'Community health compound sign supported by Fill The Gap Africa' },
    { image: '/img/photos/strip-participant.jpg', alt: 'A participant at a Fill The Gap Africa workshop' }
  ]),

  about_facts: JSON.stringify([
    { label: 'Founded', value: '2011, Accra' },
    { label: 'Registration', value: 'Registered Ghanaian non-profit' },
    { label: 'Programs', value: 'Education, enterprise, health, climate' },
    { label: 'Leadership', value: 'Dr. Vida Kabuga Akekodaga' }
  ]),

  /* --- Impact page -------------------------------------------------------- */
  impact_outcomes_kicker: 'What changed',
  impact_outcomes_title: 'Four results, <em>traced</em> to their source.',
  impact_outcomes_note:
    'Reported by community leads and partner organizations. Not estimates, and not extrapolated from a single community.',
  impact_checks_kicker: 'Accountability',
  impact_checks_title: 'How we <em>count</em>.',
  impact_checks_note:
    'A number is only useful if someone can challenge it. These are the three ways ours get challenged.',

  impact_outcomes: JSON.stringify([
    {
      icon: 'book',
      value: '250',
      title: 'Girls back in school',
      text: 'Re-enrolled and followed for at least two academic years, in partnership with CAMFED Ghana.'
    },
    {
      icon: 'briefcase',
      value: '200+',
      title: 'Women trained',
      text: 'Financial literacy and business education, with six months of follow-up coaching after each cohort.'
    },
    {
      icon: 'shield',
      value: '70% → 1%',
      title: 'Child marriage, Katiu Saa',
      text: 'After community by-laws protecting girls’ education were adopted and enforced by local leaders.'
    },
    {
      icon: 'pulse',
      value: '1 + 1',
      title: 'School and health compound',
      text: 'Built with the Katiu Saa community, so education and basic care no longer require a journey.'
    }
  ]),

  impact_checks: JSON.stringify([
    {
      title: 'Community scorecards',
      text: 'Each program is reviewed by the people it serves, using measures they helped define.'
    },
    {
      title: 'Partner verification',
      text: 'Where a result depends on a partner, CAMFED, a clinic, a district office, they confirm the figure before we publish it.'
    },
    {
      title: 'An annual public update',
      text: 'Published on this site: what changed, what did not, and what we are changing next.'
    }
  ]),

  /* --- Get involved page -------------------------------------------------- */
  involved_needs_kicker: 'Open needs',
  involved_needs_title: 'What we need <em>this</em> quarter.',
  involved_needs_note: 'A live, specific list. When something is funded or filled, we remove it.',
  involved_faq_kicker: 'Questions',
  involved_faq_title: 'Before you <em>ask</em>.',

  involved_needs: JSON.stringify([
    {
      tag: 'funding',
      title: 'Exam registration for 40 girls',
      text: 'Basic Education Certificate Examination registration for the 2026/27 academic year.'
    },
    {
      tag: 'skills',
      title: 'Two bookkeeping coaches',
      text: 'Four hours a month for six months with the Accra enterprise cohort.'
    },
    {
      tag: 'skills',
      title: 'Solar technician supervision',
      text: 'Technical oversight for two school installations under our green economy partnership.'
    },
    {
      tag: 'inkind',
      title: 'Four training laptops',
      text: 'Working laptops for the enterprise training room in Accra.'
    }
  ]),

  involved_faq: JSON.stringify([
    {
      question: 'Can I volunteer remotely?',
      answer:
        'Yes. Bookkeeping, translation, design and web support are all done remotely. Health and solar volunteering happens on site in Ghana.'
    },
    {
      question: 'Do you accept in-kind donations?',
      answer:
        'Yes, within the open needs list above. Please email before shipping anything, unsolicited goods can cost us more in storage and handling than they are worth.'
    },
    {
      question: 'Can a company fund one program only?',
      answer:
        'Yes. Named program partnerships are our most useful funding model because they can be costed, reported and renewed on evidence.'
    },
    {
      question: 'Do you issue receipts?',
      answer:
        'Yes, for every gift. Email us with the date, amount and channel and we will send a receipt and a giving statement.'
    }
  ]),

  involved_paths: JSON.stringify([
    {
      icon: 'heart',
      title: 'Give',
      text: 'Fund a program, a training cohort or a screening day. Every gift is receipted and designated to a named line of work.',
      points: 'One-off or monthly, in cedis or another currency\nMobile money, bank transfer or international link\nA written report on what your gift funded',
      link_label: 'Donate',
      link_url: '/donate'
    },
    {
      icon: 'users',
      title: 'Volunteer a skill',
      text: 'We need specialists more than general helpers. A few hours a month from the right person changes what a cohort can do.',
      points: 'Bookkeeping and business coaching\nPublic health, nursing and maternal care\nSolar installation, recycling and green skills\nTranslation, design, web and communications',
      link_label: 'Offer a skill',
      link_url: '/contact'
    },
    {
      icon: 'globe',
      title: 'Partner with us',
      text: 'Foundations, companies and public agencies: co-design a program, fund a pilot, or bring a technical capability we do not have.',
      points: 'Named program partnerships, 1 to 5 years\nGreen economy and energy transition pilots\nHealth outreach and equipment partnerships',
      link_label: 'Start a conversation',
      link_url: 'mailto'
    }
  ]),

  /* --- Contact page ------------------------------------------------------- */
  contact_form_title: 'Send a message',
  contact_submit_label: 'Send message',
  contact_success: 'Thank you. Your message has reached us and we will reply within two business days.',
  contact_form_note:
    'By sending this form you agree that we may contact you about your enquiry. We never share your details.',
  contact_aside_title: 'Direct lines',
  contact_map_caption: 'Accra, Greater Accra Region, Ghana',
  contact_topics: JSON.stringify([
    { label: 'General enquiry' },
    { label: 'Donations & giving' },
    { label: 'Partnerships & funding' },
    { label: 'Volunteering' },
    { label: 'Media & press' }
  ]),

  /* --- Donate page -------------------------------------------------------- */
  donate_momo_title: 'Mobile Money',
  donate_momo_intro: 'The fastest route in Ghana. Send to the number below and include “Donation” as the reference.',
  donate_momo: '024 483 6281',
  donate_momo_name: 'Fill The Gap Africa',
  donate_bank_title: 'Bank transfer',
  donate_bank_intro: 'Best for larger gifts, corporate giving and multi-year commitments.',
  donate_bank: 'Account details on request',
  donate_account_name: 'Fill The Gap Africa',
  donate_account_number: '',
  donate_swift: '',
  donate_bank_fallback: 'Email us and we will send full transfer instructions the same working day.',
  donate_intl_title: 'From outside Ghana',
  donate_intl_intro: 'Diaspora and international supporters can give through our secure link, or ask us for transfer details.',
  donate_intl_note: 'We will confirm receipt and send a giving statement by email.',
  donate_paypal: '',
  donate_steps_kicker: 'What happens next',
  donate_steps_title: 'A gift is a <em>promise</em>.',
  donate_trust_kicker: 'Accountability',
  donate_trust_title: 'Built to be <em>checked</em>.',
  donate_faq_kicker: 'Giving questions',
  donate_faq_title: 'The <em>practical</em> bits.',
  donate_talk_kicker: 'Prefer to talk first?',
  donate_talk_title: 'Ask us anything before you <em>give</em>.',
  donate_note:
    'Fill The Gap Africa is a registered Ghanaian non-profit. Email us for a receipt, a giving statement or to designate your gift to a specific program.',

  donate_steps: JSON.stringify([
    {
      title: 'We acknowledge within two working days',
      text: 'A named person confirms your gift, the amount received and the program it will fund.'
    },
    {
      title: 'Your gift is designated',
      text: 'If you choose a program, it goes there. If you do not, we allocate it to the most underfunded line of work and tell you which.'
    },
    {
      title: 'You get the result, not a newsletter',
      text: 'A short report on what changed, with the numbers and, where relevant, the community’s own assessment.'
    }
  ]),

  donate_checks: JSON.stringify([
    {
      icon: 'shield',
      title: 'Registered non-profit',
      text: 'Fill The Gap Africa is registered in Ghana. Our leadership and contact details are public.'
    },
    {
      icon: 'book',
      title: 'Receipts for every gift',
      text: 'Ask for a receipt or an annual giving statement at any time. We keep records by program and by donor.'
    },
    {
      icon: 'users',
      title: 'Reported to communities first',
      text: 'Before a result is published here, the community it belongs to has seen it and had the chance to dispute it.'
    }
  ]),

  donate_faq: JSON.stringify([
    {
      question: 'Can I choose which program my gift funds?',
      answer:
        'Yes. Note the program in the reference or email us after giving. If you do not choose, we allocate to the most underfunded program and tell you which.'
    },
    {
      question: 'Do you accept monthly giving?',
      answer:
        'Yes. Monthly giving is the most useful kind because it lets us commit to a cohort for a full cycle. Email us to set up a standing instruction.'
    },
    {
      question: 'Is my gift tax deductible?',
      answer:
        'For gifts into Ghana, we can issue a receipt from a registered non-profit. Rules for deduction depend on your jurisdiction, check with your adviser, and we will provide whatever documentation they need.'
    },
    {
      question: 'How do I know the money arrived?',
      answer:
        'We confirm every gift by email within two working days. If you have not heard from us, message us with the date and amount.'
    }
  ]),

  partners: JSON.stringify([
    'CAMFED Ghana',
    'Nurture Nature Foundation',
    'Quantum Medical Centre',
    'DRN School of Entrepreneurship',
    'Katiu Saa Community'
  ])
};

const PAGES = [
  {
    slug: 'about',
    template: 'about',
    title: 'About',
    hero_eyebrow: 'Who we are',
    hero_title: 'A women-led organization, working where the gap is widest.',
    hero_lede:
      'Founded in Accra in 2011. Still led by the women who started it. Still answerable to the communities we serve.',
    content: `<p class="lede">Fill The Gap Africa began in Accra in 2011 with a simple observation: the distance between what people can do and what they are allowed to do is rarely about ability. It is about access.</p>
<p>Access to a classroom that keeps a girl safe. Access to finance for a woman who already runs a business. Access to a clinic within walking distance. Access to clean energy that does not consume a month's income.</p>
<p>We are a women-led Ghanaian non-profit working in underserved communities, with deep partnerships in the Greater Accra Region and in communities such as Katiu Saa. Our work sits in four connected areas — education, enterprise, health and climate — because a family does not experience these things separately.</p>`
  },
  {
    slug: 'programs',
    template: 'programs',
    title: 'Programs',
    hero_eyebrow: 'What we do',
    hero_title: 'Four programs, one connected purpose.',
    hero_lede:
      'A girl who stays in school becomes a woman who can run a business. A clinic that works keeps that business viable. A community with clean energy keeps its young people.',
    content:
      '<p class="lede">Each program has its own lead, budget and scorecard. Together they form one continuum of support — a classroom, a clinic, a market stall and a power supply that make the same family more resilient.</p>'
  },
  {
    slug: 'impact',
    template: 'impact',
    title: 'Impact',
    hero_eyebrow: 'Impact',
    hero_title: 'Numbers we can defend.',
    hero_lede:
      'We would rather report four things we can trace than forty we cannot. Where a number comes from a partner, we say so.',
    content:
      '<p class="lede">We report the numbers we can defend and the methods behind them. Where a number comes from a partner, we say so.</p>'
  },
  {
    slug: 'get-involved',
    template: 'get-involved',
    title: 'Get involved',
    hero_eyebrow: 'Get involved',
    hero_title: 'Three useful ways to help.',
    hero_lede:
      'Vague support is easy to give and hard to use. So we have made each route specific: what we need, what it costs us, and what happens next.',
    content:
      '<p class="lede">There are three useful ways to help: give, volunteer a skill, or partner on a program.</p>'
  },
  {
    slug: 'donate',
    template: 'donate',
    title: 'Donate',
    hero_eyebrow: 'Give',
    hero_title: 'Give where it is needed. See where it went.',
    hero_lede:
      'Every gift is designated to a named program, receipted, and reported back. No card details are processed on this website.',
    content:
      '<p class="lede">Every gift is directed to a named program and reported back to you. Choose whichever way of giving is easiest — mobile money, bank transfer or an international link.</p>'
  },
  {
    slug: 'contact',
    template: 'contact',
    title: 'Contact',
    hero_eyebrow: 'Contact',
    hero_title: 'Tell us what you need. We will answer.',
    hero_lede:
      'Messages reach our team directly and we reply within two business days. For partnerships and giving, say so in the subject so it lands with the right person.',
    content:
      '<p class="lede">Questions about our work, a partnership, a grant or a visit to Accra? We would like to hear from you.</p>'
  },
  {
    slug: 'privacy',
    template: 'default',
    title: 'Privacy',
    hero_eyebrow: 'Legal',
    hero_title: 'Privacy policy',
    hero_lede: 'How we handle the information you share with us.',
    content: `<h2>Who we are</h2><p>Fill The Gap Africa is a non-profit organization registered in Ghana. Our registered address is in Accra, Ghana.</p>
<h2>What we collect</h2><p>When you use the contact form we collect the name, email address, phone number and message you provide. We also store the message in our database and, where configured, email it to our team. We do not use the form to build marketing lists.</p>
<h2>How long we keep it</h2><p>Contact messages are kept for two years, then deleted. If you would like your message removed sooner, email us and we will delete it.</p>
<h2>Cookies</h2><p>This site sets no advertising cookies. Signing in to the admin area sets a session cookie required for authentication.</p>
<h2>Your rights</h2><p>You can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. Email <a href="mailto:info@fillthegapafrica.org">info@fillthegapafrica.org</a> and we will respond within two business days.</p>
<h2>Donations</h2><p>We do not process card payments on this website. Donations are made by mobile money or bank transfer, or through a payment provider we link to.</p>`
  }
];

const PROGRAMS = [
  {
    slug: 'education',
    title: 'Education & Girls’ Empowerment',
    summary: 'Keeping girls in school — and giving them every reason to stay.',
    icon: 'book',
    cover: '/img/photos/program-education.jpg',
    content: `<p class="lede">A girl's education usually ends at the first financial shock: fees, a uniform, a pregnancy, a marriage. Our education program is built to absorb those shocks.</p>
<h2>The challenge</h2><p>In the communities where we work, girls drop out for reasons that are predictable — and therefore preventable. School costs arrive at the same time every term. Distance makes secondary school risky. Early marriage is still treated as a solution to hardship. Once a girl leaves, returning is close to impossible without an adult who advocates for her.</p>
<h2>What we do</h2><ul><li>Re-enroll girls who have dropped out, and follow them for at least two academic years.</li><li>Match each girl with a mentor who checks attendance and grades every term.</li><li>Cover the specific costs that cause dropout: fees, uniforms, books, transport, exam registration.</li><li>Train teachers and school leaders on keeping schools safe and reporting harassment.</li><li>Work with families and community leaders so that staying in school is the normal choice.</li></ul>
<h2>What changes</h2><p>With CAMFED Ghana we have returned 250 girls to school. In Katiu Saa, community by-laws protecting girls' education helped reduce child marriage from roughly 70% to 1%, with a corresponding rise in enrollment and a fall in teenage pregnancy.</p>
<h2>How you can help</h2><p>Sponsoring one girl for a school year covers fees, a uniform, books and exam registration. Email us for a costed breakdown before you give.</p>`
  },
  {
    slug: 'enterprise',
    title: 'Economic Empowerment & Enterprise',
    summary: 'Practical business training that turns effort into steady income.',
    icon: 'briefcase',
    cover: '/img/photos/program-enterprise.jpg',
    content: `<p class="lede">Most women we work with are already working. What they lack is a way to price, plan and protect the income they earn.</p>
<h2>The challenge</h2><p>A trader can run the same stall for fifteen years and never build a buffer. Without records, it is impossible to know which product makes money. Without savings, one hospital bill ends the business. And without collateral, a bank loan is out of reach.</p>
<h2>What we do</h2><ul><li>Run practical entrepreneurship training built around each participant's actual business, not a case study.</li><li>Teach financial literacy: costing, pricing, bookkeeping, separating household and business money.</li><li>Help participants form savings groups so capital stays inside the community.</li><li>Connect producers to buyers, including institutional buyers who can order at volume.</li><li>Provide follow-up coaching for six months after training.</li></ul>
<h2>What changes</h2><p>More than 200 women have completed our financial literacy and business education program. Participants leave with a costed plan, a simple record book and a savings commitment — and they can explain their margins to a lender.</p>
<h2>How you can help</h2><p>Fund a training cohort, sponsor a savings group's starter capital, or offer a market link to a producer group.</p>`
  },
  {
    slug: 'health',
    title: 'Health & Wellbeing',
    summary: 'Bringing dependable care closer to where families actually live.',
    icon: 'pulse',
    cover: '/img/photos/program-health.jpg',
    content: `<p class="lede">Distance is a health outcome. If the nearest clinic is two hours away, a routine problem becomes an emergency.</p>
<h2>The challenge</h2><p>In rural and peri-urban communities, health care fails at the last mile: staff shortages, stock-outs, and the cost of transport. Women carry most of that burden, especially during pregnancy.</p>
<h2>What we do</h2><ul><li>Support CHPS compounds with equipment, supplies and outreach.</li><li>Run community screening days for blood pressure, blood sugar and maternal risk factors.</li><li>Fund health education on maternal care, nutrition and adolescent health in schools.</li><li>Work with Quantum Medical Centre to refer complex cases into reliable clinical care.</li><li>Build and equip facilities where none exist, with the community providing land and labor.</li></ul>
<h2>What changes</h2><p>In Katiu Saa we worked with the community to establish a CHPS compound and a school, so that basic care and basic education no longer require a journey.</p>
<h2>How you can help</h2><p>Sponsor a screening day, equip a CHPS compound, or fund a maternal health outreach.</p>`
  },
  {
    slug: 'climate',
    title: 'Climate & Green Economy',
    summary: 'Clean energy and green livelihoods, designed with communities.',
    icon: 'leaf',
    cover: '/img/photos/program-climate.jpg',
    content: `<p class="lede">The energy transition will either include communities like ours or fail. We are working to make sure it includes them.</p>
<h2>The challenge</h2><p>Reliable electricity is expensive and, in many communities, absent. Waste is dumped because collection does not reach the neighborhood. Young people need work that does not depend on a single crop or season.</p>
<h2>What we do</h2><ul><li>Identify and structure green-economy projects with communities, then mobilize investment for them.</li><li>Develop solar installations for schools, clinics and small enterprises.</li><li>Support waste-to-wealth systems that turn waste into products and income.</li><li>Train young people in green skills: installation, maintenance, recycling and climate-smart agriculture.</li></ul>
<h2>Partnership</h2><p>In March 2025 we signed a five-year Memorandum of Understanding with Nurture Nature Foundation. Fill The Gap Africa mobilizes funding and identifies sustainable investment opportunities; Nurture Nature Foundation leads implementation and community engagement. Pilot projects began in June 2025.</p>
<h2>How you can help</h2><p>Co-fund a pilot, provide technical expertise, or connect us with climate financiers active in West Africa.</p>`
  }
];

const TEAM = [
  {
    name: 'Dr. Vida Kabuga Akekodaga',
    role: 'Founder & Executive Director',
    initials: 'VA',
    photo: '/img/photos/team-vida.jpg',
    bio: 'Community development practitioner, gender advocate and social entrepreneur with more than two decades of experience across Ghana. She also serves as General Manager of Quantum Medical Centre.'
  },
  {
    name: 'Adwoa Mensah',
    role: 'Programs Lead, Education & Girls',
    initials: 'AM',
    bio: 'Former basic-school head teacher who now runs our re-enrollment, mentoring and safe-schools work.'
  },
  {
    name: 'Kwabena Osei',
    role: 'Enterprise & Livelihoods Lead',
    initials: 'KO',
    bio: 'Business coach and market-linkage specialist supporting women-led micro-enterprises.'
  },
  {
    name: 'Efua Sarpong',
    role: 'Health & Community Programs',
    initials: 'ES',
    bio: 'Public health practitioner coordinating screenings, CHPS support and community health education.'
  }
];

const POSTS = [
  {
    title: 'Katiu Saa: the by-laws that changed a generation of girls',
    slug: 'katiu-saa-the-by-laws-that-changed-a-generation-of-girls',
    type: 'post',
    category: 'Field notes',
    cover: '/img/photos/post-katiu.jpg',
    published_at: '2026-09-22T08:30:00.000Z',
    excerpt:
      'Community leaders, women’s groups and our team wrote local rules that protect girls’ education — and then enforced them.',
    content: `<p class="lede">In Katiu Saa, the change did not begin with a donation. It began with a meeting.</p>
<p>Community leaders, women's groups and our team sat down to look at what was happening to girls in the community. The pattern was clear: early marriage, early pregnancy, and an education that ended around the sixth grade.</p>
<p>What came out of those meetings were local by-laws — rules written and adopted by the community itself — that protect a girl's right to stay in school.</p>
<h2>The result</h2><p>Child marriage in the community fell from roughly 70% to 1%. Girls returned to classrooms. Teenage pregnancy declined. Families that had treated a daughter's marriage as a financial solution began to see school as the better investment.</p>
<p>Alongside the by-laws, the community built a school and a CHPS health compound with our support — the two institutions that make staying in school practical.</p>
<h2>What we learned</h2><p>Enforcement matters as much as adoption. The by-laws work because chiefs, elders and women's groups hold each other to them, and because there is now a school worth staying in.</p>`
  },
  {
    title: 'What practical entrepreneurship training actually looks like',
    slug: 'what-practical-entrepreneurship-training-actually-looks-like',
    type: 'post',
    category: 'Field notes',
    cover: '/img/photos/post-enterprise.jpg',
    published_at: '2026-08-04T10:00:00.000Z',
    excerpt:
      'No case studies about imaginary companies. Participants bring their own books, their own stock and their own margins.',
    content: `<p class="lede">Most business training fails because it teaches a business the participant does not run. Ours starts with the stall, the stock and the notebook they already have.</p>
<p>On the first day, each participant writes down what they sell, what they paid for it and what they sold it for. For many, it is the first time they have seen their own margin on paper.</p>
<p>From there the curriculum is built around four questions: What does this cost me? What should I charge? Where does the money go? What happens if I lose a week?</p>
<h2>Why follow-up matters more than the workshop</h2><p>The first quarter after training is when new practices collapse. So every participant gets a coach for six months, with a check-in every fortnight.</p>
<h2>What participants say</h2><p>The clearest result is not a new business — it is a business that survives a bad month. Separating household money from working capital, and keeping a small buffer, changes what a family can absorb.</p>`
  },
  {
    title: 'Fill The Gap Africa and Nurture Nature Foundation sign green economy MoU',
    slug: 'fill-the-gap-africa-and-nurture-nature-foundation-sign-green-economy-mou',
    type: 'post',
    category: 'Partnerships',
    cover: '/img/photos/post-mou.jpg',
    published_at: '2025-04-16T09:00:00.000Z',
    excerpt:
      'A five-year agreement to source investment and deliver solar, waste-to-wealth and other green projects in Ghana.',
    content: `<p class="lede">Fill The Gap Africa and Nurture Nature Foundation have signed a Memorandum of Understanding to collaborate on sourcing investment and managing green economy and energy transition projects in Ghana.</p>
<p>The MoU was signed on 14 March 2025 in Accra. Under the agreement, Fill The Gap Africa will mobilize funding and identify sustainable investment opportunities, while Nurture Nature Foundation will focus on project implementation and community engagement.</p>
<p>The partnership is expected to roll out solar energy installations, waste-to-wealth management systems and other environmentally focused interventions at community level.</p>
<blockquote><p>This partnership aligns with our commitment to promoting clean energy and a sustainable environment, which is key to Ghana's development.</p><cite>Peter Asiedu, Executive Director, Nurture Nature Foundation</cite></blockquote>
<p>The initial phase spans five years, with renewal based on performance and impact. Pilot projects began in June 2025.</p>`
  },
  {
    title: 'Community health screening day — Katiu Saa',
    slug: 'community-health-screening-day-katiu-saa',
    type: 'event',
    category: 'Health',
    cover: '/img/photos/program-health.jpg',
    event_start: '2026-11-14T09:00:00.000Z',
    event_end: '2026-11-14T15:00:00.000Z',
    event_location: 'Katiu Saa Community Centre, Greater Accra',
    excerpt:
      'Free blood pressure, blood sugar and maternal health checks, with referrals into clinical care.',
    content: `<p class="lede">Our monthly screening day returns to Katiu Saa with free blood pressure, blood sugar and maternal health checks.</p>
<p>The team will be joined by nurses from our health partners and by community volunteers. Anyone can attend — no registration and no cost.</p>
<h2>What to expect</h2><ul><li>Blood pressure and blood sugar checks</li><li>Maternal health advice and referral</li><li>Nutrition and adolescent health information</li><li>Referral into clinical care where needed</li></ul>
<p>If you would like to support a screening day, email us for the cost breakdown.</p>`
  },
  {
    title: 'Enterprise cohort graduation — Accra',
    slug: 'enterprise-cohort-graduation-accra',
    type: 'event',
    category: 'Enterprise',
    cover: '/img/photos/post-enterprise.jpg',
    event_start: '2026-06-20T10:00:00.000Z',
    event_end: '2026-06-20T13:00:00.000Z',
    event_location: 'Accra, Greater Accra Region',
    excerpt:
      'Twenty-six women completed six months of training and coaching. Here is what they built.',
    content: `<p class="lede">Twenty-six women completed our six-month enterprise program in Accra, presenting costed business plans to a panel of local lenders and buyers.</p>
<p>The cohort included food processors, tailors, traders and a solar technician. Each participant left with a record book, a savings commitment and a named coach.</p>
<h2>Why graduation matters</h2><p>Finishing is the point. Most training programs lose participants in the first month; ours keep them through six because the curriculum is built around the business they already run.</p>`
  }
];

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'post',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  event_start TEXT,
  event_end TEXT,
  event_location TEXT NOT NULL DEFAULT '',
  author_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  template TEXT NOT NULL DEFAULT 'default',
  hero_eyebrow TEXT NOT NULL DEFAULT '',
  hero_title TEXT NOT NULL DEFAULT '',
  hero_lede TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'book',
  cover TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  initials TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT 'General enquiry',
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type, status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_programs_order ON programs(sort_order);
`;

/* -------------------------------------------------------------------------- */
/* Initialisation                                                              */
/* -------------------------------------------------------------------------- */

function nowIso() {
  return new Date().toISOString();
}

function persist() {
  if (!db || !dbFile) return;
  const data = Buffer.from(db.export());
  const tmp = dbFile + '.tmp';
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, dbFile);
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function insert(sql, params = []) {
  db.run(sql, params);
  const row = get('SELECT last_insert_rowid() AS id');
  persist();
  return row ? row.id : null;
}

function transaction(fn) {
  db.run('BEGIN');
  try {
    const result = fn();
    db.run('COMMIT');
    persist();
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

async function init() {
  if (db) return db;

  fs.mkdirSync(config.dataDir, { recursive: true });
  dbFile = path.join(config.dataDir, config.dbFile);

  const wasmDir = path.dirname(require.resolve('sql.js'));
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file)
  });

  if (fs.existsSync(dbFile)) {
    db = new SQL.Database(fs.readFileSync(dbFile));
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);

  try {
    seedSettings();
    seedAdmin();
    seedContent();
    normalizeContent();
    migrateEmailSettings();
  } catch (error) {
    console.error('[seed] failed:', error && error.stack ? error.stack : error);
    throw error;
  }
  persist();

  return db;
}

function seedSettings() {
  const count = get('SELECT COUNT(*) AS n FROM settings');
  if (count && count.n > 0) return;

  Object.entries(SETTING_DEFAULTS).forEach(([key, value]) => {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
  });
}

function seedAdmin() {
  const count = get('SELECT COUNT(*) AS n FROM users');
  if (count && count.n > 0) return;

  const hash = bcrypt.hashSync(config.admin.password, 10);
  db.run(
    'INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
    [config.admin.name, config.admin.email, hash, 'admin', nowIso()]
  );
  console.log(`[seed] administrator created: ${config.admin.email}`);
}

function seedContent() {
  const pageCount = get('SELECT COUNT(*) AS n FROM pages');
  if (!pageCount || pageCount.n === 0) {
    const stamp = nowIso();
    PAGES.forEach((page) => {
      db.run(
        `INSERT INTO pages (slug, title, template, hero_eyebrow, hero_title, hero_lede, content, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [page.slug, page.title, page.template, page.hero_eyebrow, page.hero_title, page.hero_lede, page.content, stamp, stamp]
      );
    });
  }

  const programCount = get('SELECT COUNT(*) AS n FROM programs');
  if (!programCount || programCount.n === 0) {
    const stamp = nowIso();
    PROGRAMS.forEach((program, index) => {
      db.run(
        `INSERT INTO programs (title, slug, summary, content, icon, cover, sort_order, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [program.title, program.slug, program.summary, program.content, program.icon, program.cover || '', index + 1, stamp, stamp]
      );
    });
  }

  const teamCount = get('SELECT COUNT(*) AS n FROM team');
  if (!teamCount || teamCount.n === 0) {
    const stamp = nowIso();
    TEAM.forEach((member, index) => {
      db.run(
        `INSERT INTO team (name, role, bio, initials, photo, sort_order, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [member.name, member.role, member.bio, member.initials, member.photo || '', index + 1, stamp, stamp]
      );
    });
  }

  const postCount = get('SELECT COUNT(*) AS n FROM posts');
  if (!postCount || postCount.n === 0) {
    const stamp = nowIso();
    POSTS.forEach((post) => {
      db.run(
        `INSERT INTO posts (type, title, slug, excerpt, content, cover, category, status, published_at, event_start, event_end, event_location, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?, ?)`,
        [
          post.type,
          post.title,
          post.slug,
          post.excerpt,
          post.content,
          post.cover || '',
          post.category,
          post.published_at || post.event_start || stamp,
          post.event_start || null,
          post.event_end || null,
          post.event_location || '',
          stamp,
          stamp
        ]
      );
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Settings helpers                                                            */
/* -------------------------------------------------------------------------- */

function cleanDashes(value) {
  return String(value == null ? '' : value)
    .replace(/(\d)\s*[\u2014\u2013]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[\u2014]\s*/g, ', ')
    .replace(/\s*[\u2013]\s*/g, ' to ')
    .replace(/&mdash;/g, ', ')
    .replace(/&ndash;/g, ' to ')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .replace(/[ \t]{2,}/g, ' ');
}

function normalizeContent() {
  const tables = [
    ['pages', ['title', 'hero_title', 'hero_lede', 'content']],
    ['posts', ['title', 'excerpt', 'content']],
    ['programs', ['title', 'summary', 'content']],
    ['team', ['name', 'role', 'bio']]
  ];

  tables.forEach(([table, columns]) => {
    const rows = all(`SELECT id, ${columns.join(', ')} FROM ${table}`);
    rows.forEach((row) => {
      const updates = {};
      columns.forEach((column) => {
        const cleaned = cleanDashes(row[column]);
        if (cleaned !== row[column]) updates[column] = cleaned;
      });
      const keys = Object.keys(updates);
      if (keys.length) {
        const sets = keys.map((key) => `${key} = ?`).join(', ');
        db.run(`UPDATE ${table} SET ${sets} WHERE id = ?`, [...keys.map((key) => updates[key]), row.id]);
      }
    });
  });

  const settingRows = all('SELECT key, value FROM settings');
  settingRows.forEach((row) => {
    const cleaned = cleanDashes(row.value);
    if (cleaned !== row.value) {
      db.run('UPDATE settings SET value = ? WHERE key = ?', [cleaned, row.key]);
    }
  });
}

function migrateEmailSettings() {
  db.run("UPDATE settings SET value = 'info@fillthegapafrica.org' WHERE key = 'contact_email' AND value LIKE '%v.kabuga%'");

  if (!get("SELECT key FROM settings WHERE key = 'donate_email'")) {
    db.run("INSERT INTO settings (key, value) VALUES ('donate_email', 'donate@fillthegapafrica.org')");
  }

  ['pages', 'posts', 'programs'].forEach((table) => {
    db.run(`UPDATE ${table} SET content = replace(content, 'v.kabuga@fillthegapafrica.org', 'info@fillthegapafrica.org')`);
  });
}

function getSettings() {
  const rows = all('SELECT key, value FROM settings');
  const settings = {};
  Object.entries(SETTING_DEFAULTS).forEach(([key, value]) => {
    settings[key] = cleanDashes(value);
  });
  rows.forEach((row) => {
    settings[row.key] = cleanDashes(row.value);
  });
  return settings;
}

function getSetting(key) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : SETTING_DEFAULTS[key] || '';
}

function setSettings(values) {
  transaction(() => {
    Object.entries(values).forEach(([key, value]) => {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value == null ? '' : value)]);
    });
  });
}

module.exports = {
  init,
  all,
  get,
  run,
  insert,
  transaction,
  persist,
  getSettings,
  getSetting,
  setSettings,
  nowIso,
  SETTING_DEFAULTS
};
