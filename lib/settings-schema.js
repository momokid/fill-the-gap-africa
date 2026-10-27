'use strict';

/**
 * The Settings studio schema.
 *
 * One declaration drives three things: the admin form, the list of setting
 * keys the server is willing to save, and the validation limits applied to
 * each field. Add a field here, seed a default in lib/db.js, then read the
 * value from `site.<key>` in a view.
 *
 * Field types: text (default), textarea, select, color, number, checkbox.
 * Repeater columns: text (default), textarea, lines, select, image, link.
 */

const ICON_OPTIONS = [
  ['book', 'Book — education'],
  ['briefcase', 'Briefcase — enterprise'],
  ['pulse', 'Pulse — health'],
  ['leaf', 'Leaf — climate'],
  ['heart', 'Heart — giving'],
  ['users', 'People'],
  ['globe', 'Globe'],
  ['shield', 'Shield'],
  ['spark', 'Spark'],
  ['bank', 'Bank'],
  ['calendar', 'Calendar']
];

const NEED_TAGS = [
  ['funding', 'Funding'],
  ['skills', 'Skills'],
  ['inkind', 'In-kind']
];

const TABS = [
  {
    id: 'general',
    label: 'General',
    blocks: ['logo', 'menu', 'partners'],
    sections: [
      {
        title: 'Identity',
        fields: [
          { key: 'site_name', label: 'Organization name' },
          { key: 'site_tagline', label: 'Tagline', hint: 'Used in the browser title and link previews.' },
          { key: 'site_description', label: 'Site description', type: 'textarea', hint: 'One or two sentences for search engines and social sharing.' }
        ]
      },
      {
        title: 'Footer',
        fields: [
          { key: 'footer_tagline', label: 'Footer tagline', type: 'textarea' },
          { key: 'legal_text', label: 'Legal line', type: 'textarea' }
        ]
      }
    ]
  },
  {
    id: 'homepage',
    label: 'Homepage',
    blocks: ['hero_image'],
    sections: [
      {
        title: 'Hero',
        fields: [
          { key: 'hero_eyebrow', label: 'Eyebrow' },
          { key: 'hero_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for italic emphasis.' },
          { key: 'hero_lede', label: 'Intro paragraph', type: 'textarea' },
          { key: 'hero_cta_label', label: 'Primary button label' },
          { key: 'hero_cta_url', label: 'Primary button link' },
          { key: 'hero_cta2_label', label: 'Secondary button label' },
          { key: 'hero_cta2_url', label: 'Secondary button link' }
        ]
      },
      {
        title: 'Floating card',
        fields: [
          { key: 'hero_stat_value', label: 'Floating card number' },
          { key: 'hero_stat_label', label: 'Floating card caption', type: 'textarea' }
        ]
      },
      {
        title: 'Headline numbers',
        fields: [
          { key: 'stats_label', label: 'Numbers label' },
          { key: 'stats_meta', label: 'Numbers meta' },
          { key: 'stat_1_value', label: 'Number 1' },
          { key: 'stat_1_label', label: 'Caption 1' },
          { key: 'stat_2_value', label: 'Number 2' },
          { key: 'stat_2_label', label: 'Caption 2' },
          { key: 'stat_3_value', label: 'Number 3' },
          { key: 'stat_3_label', label: 'Caption 3' },
          { key: 'stat_4_value', label: 'Number 4' },
          { key: 'stat_4_label', label: 'Caption 4' }
        ]
      },
      {
        title: 'The gap / mission',
        fields: [
          { key: 'mission_kicker', label: 'Eyebrow' },
          { key: 'mission_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'mission_lede', label: 'Intro paragraph', type: 'textarea' },
          { key: 'mission_body', label: 'Second paragraph', type: 'textarea' }
        ]
      },
      {
        title: 'Programs section',
        fields: [
          { key: 'programs_kicker', label: 'Eyebrow' },
          { key: 'programs_title', label: 'Headline' },
          { key: 'programs_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'How we work',
        fields: [
          { key: 'approach_kicker', label: 'Eyebrow' },
          { key: 'approach_title', label: 'Headline' },
          { key: 'approach_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'Field story',
        fields: [
          { key: 'story_kicker', label: 'Eyebrow' },
          { key: 'story_title', label: 'Headline' },
          { key: 'story_place', label: 'Place label' },
          { key: 'story_tag', label: 'Corner tag' },
          { key: 'story_lede', label: 'First paragraph', type: 'textarea' },
          { key: 'story_body', label: 'Second paragraph', type: 'textarea' },
          { key: 'story_link_label', label: 'Button label' },
          { key: 'story_link_url', label: 'Button link' }
        ]
      },
      {
        title: 'Partners strip',
        fields: [
          { key: 'partners_title', label: 'Label' },
          { key: 'partners_note', label: 'Note', type: 'textarea' }
        ]
      },
      {
        title: 'Stories section',
        fields: [
          { key: 'news_kicker', label: 'Eyebrow' },
          { key: 'news_title', label: 'Headline' },
          { key: 'news_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'Events section',
        fields: [
          { key: 'events_kicker', label: 'Eyebrow' },
          { key: 'events_title', label: 'Headline' },
          { key: 'events_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'Call to action band',
        fields: [
          { key: 'cta_title', label: 'Headline' },
          { key: 'cta_body', label: 'Body', type: 'textarea' },
          { key: 'cta_primary_label', label: 'Primary button label' },
          { key: 'cta_primary_url', label: 'Primary button link' },
          { key: 'cta_secondary_label', label: 'Secondary button label' },
          { key: 'cta_secondary_url', label: 'Secondary button link' }
        ]
      }
    ],
    repeaters: [
      {
        key: 'home_facts',
        title: 'At a glance facts',
        hint: 'The three small facts under the mission text on the homepage.',
        addLabel: 'Add fact',
        columns: [
          { name: 'label', label: 'Label', placeholder: 'Founded' },
          { name: 'value', label: 'Value', placeholder: '2011, Accra, Ghana' }
        ]
      },
      {
        key: 'approach_steps',
        title: 'How we work steps',
        hint: 'Shared with the About page. These are the numbered steps.',
        addLabel: 'Add step',
        columns: [
          { name: 'title', label: 'Step title', placeholder: 'Listen first' },
          { name: 'text', label: 'Step text', type: 'textarea' }
        ]
      },
      {
        key: 'story_points',
        title: 'Field story checklist',
        hint: 'The ticked list beside the field story.',
        addLabel: 'Add point',
        columns: [{ name: 'text', label: 'Point', placeholder: 'By-laws written and enforced by the community itself' }]
      }
    ]
  },
  {
    id: 'about',
    label: 'About page',
    blocks: [],
    sections: [
      {
        title: 'Values section',
        fields: [
          { key: 'about_values_kicker', label: 'Eyebrow' },
          { key: 'about_values_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'about_values_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'At a glance card',
        fields: [{ key: 'about_facts_title', label: 'Card title' }]
      },
      {
        title: 'Team section',
        fields: [
          { key: 'about_team_kicker', label: 'Eyebrow' },
          { key: 'about_team_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'about_team_note', label: 'Side note', type: 'textarea' }
        ]
      }
    ],
    repeaters: [
      {
        key: 'about_values',
        title: 'Values cards',
        hint: 'Numbered automatically.',
        addLabel: 'Add value',
        columns: [
          { name: 'title', label: 'Value', placeholder: 'Community first' },
          { name: 'text', label: 'Description', type: 'textarea' }
        ]
      },
      {
        key: 'about_photos',
        title: 'Photo strip images',
        hint: 'Use an image from Media, or a path such as /img/photos/strip-water.jpg. The page heading and body are edited under Pages → About.',
        addLabel: 'Add photo',
        maxRows: 6,
        columns: [
          { name: 'image', label: 'Image', type: 'image' },
          { name: 'alt', label: 'Alt text', placeholder: 'Describe the photo for screen readers' }
        ]
      },
      {
        key: 'about_facts',
        title: 'At a glance facts',
        addLabel: 'Add fact',
        columns: [
          { name: 'label', label: 'Label', placeholder: 'Founded' },
          { name: 'value', label: 'Value', placeholder: '2011, Accra' }
        ]
      }
    ]
  },
  {
    id: 'impact',
    label: 'Impact page',
    blocks: [],
    sections: [
      {
        title: 'Results section',
        fields: [
          { key: 'impact_outcomes_kicker', label: 'Eyebrow' },
          { key: 'impact_outcomes_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'impact_outcomes_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'Accountability section',
        fields: [
          { key: 'impact_checks_kicker', label: 'Eyebrow' },
          { key: 'impact_checks_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'impact_checks_note', label: 'Intro', type: 'textarea' }
        ]
      },
      {
        title: 'Shared sections',
        fields: [
          { key: 'impact_shared_note', label: 'Numbers and field story', type: 'note', hint: 'The numbers band uses Homepage → Headline numbers. The field story at the foot of this page uses Homepage → Field story.' }
        ]
      }
    ],
    repeaters: [
      {
        key: 'impact_outcomes',
        title: 'Result cards',
        hint: 'Four cards work best. The number is shown large.',
        addLabel: 'Add result',
        maxRows: 8,
        columns: [
          { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS, default: 'spark' },
          { name: 'value', label: 'Number', placeholder: '250' },
          { name: 'title', label: 'Title', placeholder: 'Girls back in school' },
          { name: 'text', label: 'Description', type: 'textarea' }
        ]
      },
      {
        key: 'impact_checks',
        title: 'Accountability steps',
        addLabel: 'Add step',
        columns: [
          { name: 'title', label: 'Title', placeholder: 'Community scorecards' },
          { name: 'text', label: 'Description', type: 'textarea' }
        ]
      }
    ]
  },
  {
    id: 'involved',
    label: 'Get involved',
    blocks: [],
    sections: [
      {
        title: 'Open needs section',
        fields: [
          { key: 'involved_needs_kicker', label: 'Eyebrow' },
          { key: 'involved_needs_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'involved_needs_note', label: 'Side note', type: 'textarea' }
        ]
      },
      {
        title: 'Questions section',
        fields: [
          { key: 'involved_faq_kicker', label: 'Eyebrow' },
          { key: 'involved_faq_title', label: 'Headline', hint: 'Wrap a word in <em>…</em> for emphasis.' }
        ]
      },
    ],
    repeaters: [
      {
        key: 'involved_paths',
        title: 'Ways to get involved',
        hint: 'The cards at the top of the page. Three work best; the first card is the highlighted one. Button links take a path like /donate, a full https:// address, or the word mailto to email the contact address.',
        addLabel: 'Add a way to help',
        maxRows: 4,
        columns: [
          { name: 'title', label: 'Title', placeholder: 'Give' },
          { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS, default: 'heart' },
          { name: 'text', label: 'Description', type: 'textarea' },
          { name: 'points', label: 'Bullet points, one per line', type: 'lines' },
          { name: 'link_label', label: 'Button label', placeholder: 'Donate' },
          { name: 'link_url', label: 'Button link', type: 'link', placeholder: '/donate' }
        ]
      },
      {
        key: 'involved_needs',
        title: 'Open needs',
        hint: 'Keep this list current: remove an item as soon as it is funded or filled.',
        addLabel: 'Add need',
        columns: [
          { name: 'tag', label: 'Type', type: 'select', options: NEED_TAGS, default: 'funding' },
          { name: 'title', label: 'Need', placeholder: 'Exam registration for 40 girls' },
          { name: 'text', label: 'Detail', type: 'textarea' }
        ]
      },
      {
        key: 'involved_faq',
        title: 'Questions and answers',
        addLabel: 'Add question',
        columns: [
          { name: 'question', label: 'Question', placeholder: 'Can I volunteer remotely?' },
          { name: 'answer', label: 'Answer', type: 'textarea' }
        ]
      }
    ]
  },
  {
    id: 'contact',
    label: 'Contact',
    blocks: ['contact_map'],
    sections: [
      {
        title: 'Contact details',
        fields: [
          { key: 'contact_address', label: 'Address', type: 'textarea' },
          { key: 'contact_phone', label: 'Phone' },
          { key: 'contact_email', label: 'Email' },
          { key: 'contact_hours', label: 'Office hours' },
          { key: 'contact_note', label: 'Short note under the form', type: 'textarea' }
        ]
      },
      {
        title: 'Form and card',
        fields: [
          { key: 'contact_form_title', label: 'Form heading' },
          { key: 'contact_submit_label', label: 'Submit button label' },
          { key: 'contact_success', label: 'Thank-you message', type: 'textarea' },
          { key: 'contact_form_note', label: 'Privacy note under the form', type: 'textarea' },
          { key: 'contact_aside_title', label: 'Contact card heading' }
        ]
      },
      {
        title: 'Map',
        fields: [
          { key: 'contact_map', label: 'Show the map on the contact page', type: 'checkbox' },
          { key: 'contact_map_caption', label: 'Map caption' }
        ]
      }
    ],
    repeaters: [
      {
        key: 'contact_topics',
        title: 'Enquiry subjects',
        hint: 'The options in “What is this about?”. Two to six works best.',
        addLabel: 'Add subject',
        maxRows: 8,
        columns: [{ name: 'label', label: 'Subject', placeholder: 'General enquiry' }]
      }
    ]
  },
  {
    id: 'social',
    label: 'Social',
    blocks: [],
    sections: [
      {
        title: 'Social profiles',
        fields: [
          { key: 'social_facebook', label: 'Facebook URL' },
          { key: 'social_instagram', label: 'Instagram URL' },
          { key: 'social_linkedin', label: 'LinkedIn URL' },
          { key: 'social_x', label: 'X URL' },
          { key: 'social_youtube', label: 'YouTube URL' }
        ]
      }
    ]
  },
  {
    id: 'giving',
    label: 'Giving',
    blocks: [],
    sections: [
      {
        title: 'Mobile Money',
        fields: [
          { key: 'donate_email', label: 'Giving email', hint: 'Used for donation enquiries, receipts and giving details.' },
          { key: 'donate_momo_title', label: 'Card heading', placeholder: 'Mobile Money' },
          { key: 'donate_momo_intro', label: 'Card text', type: 'textarea' },
          { key: 'donate_momo', label: 'Mobile Money number' },
          { key: 'donate_momo_name', label: 'Account name' }
        ]
      },
      {
        title: 'Bank transfer',
        fields: [
          { key: 'donate_bank_title', label: 'Card heading', placeholder: 'Bank transfer' },
          { key: 'donate_bank_intro', label: 'Card text', type: 'textarea' },
          { key: 'donate_bank', label: 'Bank name' },
          { key: 'donate_account_name', label: 'Account name' },
          { key: 'donate_account_number', label: 'Account number' },
          { key: 'donate_swift', label: 'SWIFT / sort code' },
          { key: 'donate_bank_fallback', label: 'Shown when there is no account number', type: 'textarea' }
        ]
      },
      {
        title: 'International giving',
        fields: [
          { key: 'donate_intl_title', label: 'Card heading', placeholder: 'From outside Ghana' },
          { key: 'donate_intl_intro', label: 'Card text', type: 'textarea' },
          { key: 'donate_paypal', label: 'Payment link', hint: 'PayPal, Stripe or another giving link. Leave empty to show “Request giving details”.' },
          { key: 'donate_intl_note', label: 'Note under the button', type: 'textarea' }
        ]
      },
      {
        title: 'Sections',
        fields: [
          { key: 'donate_steps_kicker', label: '“What happens next” eyebrow' },
          { key: 'donate_steps_title', label: '“What happens next” headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'donate_trust_kicker', label: '“Accountability” eyebrow' },
          { key: 'donate_trust_title', label: '“Accountability” headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'donate_faq_kicker', label: 'Giving questions eyebrow' },
          { key: 'donate_faq_title', label: 'Giving questions headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'donate_talk_kicker', label: 'Closing eyebrow' },
          { key: 'donate_talk_title', label: 'Closing headline', hint: 'Wrap a word in <em>…</em> for emphasis.' },
          { key: 'donate_note', label: 'Giving note', type: 'textarea' }
        ]
      }
    ],
    repeaters: [
      {
        key: 'donate_steps',
        title: 'What happens next',
        hint: 'The numbered steps under the giving cards.',
        addLabel: 'Add step',
        maxRows: 6,
        columns: [
          { name: 'title', label: 'Title', placeholder: 'We acknowledge within two working days' },
          { name: 'text', label: 'Description', type: 'textarea' }
        ]
      },
      {
        key: 'donate_checks',
        title: 'Accountability points',
        addLabel: 'Add point',
        maxRows: 6,
        columns: [
          { name: 'title', label: 'Title', placeholder: 'Receipts for every gift' },
          { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS, default: 'shield' },
          { name: 'text', label: 'Description', type: 'textarea' }
        ]
      },
      {
        key: 'donate_faq',
        title: 'Giving questions',
        addLabel: 'Add question',
        maxRows: 10,
        columns: [
          { name: 'question', label: 'Question', placeholder: 'Can I choose which program my gift funds?' },
          { name: 'answer', label: 'Answer', type: 'textarea' }
        ]
      }
    ]
  },
  {
    id: 'design',
    label: 'Design',
    blocks: [],
    sections: [
      {
        title: 'Typography',
        fields: [
          { key: 'font_body', label: 'Body font', type: 'select', options: [['inter', 'Inter'], ['manrope', 'Manrope'], ['dmsans', 'DM Sans'], ['sourcesans', 'Source Sans 3'], ['system', 'System UI']] },
          { key: 'font_heading', label: 'Heading font', type: 'select', options: [['intertight', 'Inter Tight'], ['inter', 'Inter'], ['fraunces', 'Fraunces'], ['dmserif', 'DM Serif Display'], ['playfair', 'Playfair Display']] },
          { key: 'font_base', label: 'Base font size (px)', type: 'number', min: 16, max: 24, hint: 'Scales the whole site. Minimum 16.' }
        ]
      },
      {
        title: 'Colours',
        fields: [
          { key: 'color_brand', label: 'Primary colour', type: 'color' },
          { key: 'color_brand_dark', label: 'Primary dark', type: 'color' },
          { key: 'color_cta', label: 'Action colour', type: 'color' },
          { key: 'color_cta_dark', label: 'Action dark', type: 'color' }
        ]
      },
      {
        title: 'Layout',
        fields: [
          { key: 'container_width', label: 'Content width (px)', type: 'number', min: 960, max: 1600 },
          { key: 'section_spacing', label: 'Section spacing (px)', type: 'number', min: 40, max: 160 },
          { key: 'radius', label: 'Corner radius (px)', type: 'number', min: 0, max: 32 }
        ]
      },
      {
        title: 'Homepage sections',
        fields: [
          { key: 'show_stats', label: 'Headline numbers', type: 'checkbox' },
          { key: 'show_mission', label: 'The gap / mission', type: 'checkbox' },
          { key: 'show_programs', label: 'Programs', type: 'checkbox' },
          { key: 'show_approach', label: 'How we work', type: 'checkbox' },
          { key: 'show_story', label: 'Field story', type: 'checkbox' },
          { key: 'show_partners', label: 'Partners strip', type: 'checkbox' },
          { key: 'show_news', label: 'Latest stories', type: 'checkbox' },
          { key: 'show_events', label: 'Upcoming events', type: 'checkbox' },
          { key: 'show_cta', label: 'Call to action band', type: 'checkbox' }
        ]
      }
    ]
  },
  {
    id: 'security',
    label: 'Security',
    blocks: [],
    sections: [
      {
        title: 'Admin URL',
        fields: [
          { key: 'admin_path', label: 'Admin path', hint: 'The private address of this studio, for example /studio-7k2x. Letters, numbers and hyphens, at least 6 characters. Public pages cannot be used.' }
        ]
      }
    ]
  }
];

const COLORS = ['color_brand', 'color_brand_dark', 'color_cta', 'color_cta_dark'];

const NUMBERS = {
  font_base: [16, 24],
  container_width: [960, 1600],
  section_spacing: [40, 160],
  radius: [0, 32]
};

const CHOICES = {
  font_body: ['inter', 'manrope', 'dmsans', 'sourcesans', 'system'],
  font_heading: ['intertight', 'inter', 'fraunces', 'dmserif', 'playfair']
};

const CHECKBOXES = ['contact_map', 'show_stats', 'show_mission', 'show_programs', 'show_approach', 'show_story', 'show_partners', 'show_news', 'show_events', 'show_cta'];

/** Long-form fields get a larger character budget. */
const LONG_TEXT = new Set([
  'site_description', 'hero_lede', 'mission_lede', 'mission_body', 'programs_note',
  'approach_note', 'partners_note', 'news_note', 'events_note', 'cta_body',
  'story_lede', 'story_body', 'contact_note', 'contact_form_note', 'contact_success',
  'about_values_note', 'about_team_note', 'impact_outcomes_note', 'impact_checks_note',
  'involved_needs_note', 'footer_tagline', 'legal_text', 'donate_note',
  'donate_momo_intro', 'donate_bank_intro', 'donate_bank_fallback', 'donate_intl_intro',
  'donate_intl_note'
]);

const TAB_IDS = TABS.map((tab) => tab.id);

function getTab(id) {
  return TABS.find((tab) => tab.id === id) || TABS[0];
}

function fieldsOf(tab) {
  return tab.sections.reduce((all, section) => all.concat(section.fields), []);
}

/** Every setting key a tab is allowed to write. */
function keysOf(tab) {
  return fieldsOf(tab)
    .filter((field) => field.type !== 'note')
    .map((field) => field.key);
}

function repeatersOf(tab) {
  return tab.repeaters || [];
}

function isLongText(key) {
  return LONG_TEXT.has(key);
}

module.exports = {
  TABS,
  TAB_IDS,
  COLORS,
  NUMBERS,
  CHOICES,
  CHECKBOXES,
  getTab,
  keysOf,
  repeatersOf,
  isLongText
};
