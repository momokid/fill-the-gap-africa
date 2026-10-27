/**
 * Content studio behaviour: rich text editor, confirmations, mobile nav.
 */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------- */
  /* Simple rich-text editor (contenteditable + execCommand)                 */
  /* ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-editor]').forEach(function (wrap) {
    var form = wrap.closest('form');
    var textarea = wrap.querySelector('textarea');
    var surface = wrap.querySelector('.editor__surface');

    if (!form || !textarea || !surface) return;

    surface.innerHTML = textarea.value || '';

    function sync() {
      textarea.value = surface.innerHTML.trim();
    }

    surface.addEventListener('input', sync);
    surface.addEventListener('blur', sync);

    wrap.querySelectorAll('[data-cmd]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        surface.focus();
        var command = button.getAttribute('data-cmd');

        if (command === 'createLink') {
          var url = window.prompt('Link URL (https://…)');
          if (url) document.execCommand('createLink', false, url);
        } else if (command === 'formatBlock') {
          document.execCommand('formatBlock', false, button.getAttribute('data-value') || 'p');
        } else {
          document.execCommand(command, false, null);
        }

        sync();
      });
    });

    form.addEventListener('submit', sync);
  });

  /* ---------------------------------------------------------------------- */
  /* Destructive actions need confirmation                                   */
  /* ---------------------------------------------------------------------- */
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var message = form.getAttribute('data-confirm') || 'Are you sure?';
      if (!window.confirm(message)) {
        event.preventDefault();
      }
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Mobile sidebar                                                          */
  /* ---------------------------------------------------------------------- */
  var burger = document.querySelector('[data-admin-menu]');

  if (burger) {
    burger.addEventListener('click', function () {
      document.body.classList.toggle('admin-nav-open');
    });

    document.addEventListener('click', function (event) {
      if (!document.body.classList.contains('admin-nav-open')) return;
      if (event.target.closest('.sidebar') || event.target.closest('[data-admin-menu]')) return;
      document.body.classList.remove('admin-nav-open');
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Copy a media URL                                                        */
  /* ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-copy-url]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy-url');
      var original = button.textContent;

      var done = function () {
        button.textContent = 'Copied';
        window.setTimeout(function () {
          button.textContent = original;
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () {});
        return;
      }

      var temp = document.createElement('textarea');
      temp.value = value;
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand('copy');
        done();
      } catch (error) {
        /* ignore */
      }
      document.body.removeChild(temp);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Preview the selected image before uploading                             */
  /* ---------------------------------------------------------------------- */
  document.querySelectorAll('[data-upload]').forEach(function (wrapper) {
    var input = wrapper.querySelector('input[type="file"]');
    var preview = wrapper.querySelector('[data-preview]');

    if (!input || !preview) return;

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (event) {
        preview.innerHTML = '<img src="' + event.target.result + '" alt="">';
      };
      reader.readAsDataURL(file);
    });
  });
})();


/* Partner rows */
(() => {
  const wrap = document.querySelector('[data-partners]');
  if (!wrap) return;

  const rows = wrap.querySelector('[data-partner-rows]');
  const add = wrap.querySelector('[data-add-partner]');

  const bindRemove = (button) => {
    button.addEventListener('click', () => {
      if (rows.children.length > 1) button.closest('.partner-row').remove();
      else {
        button.closest('.partner-row').querySelectorAll('input').forEach((input) => { input.value = ''; });
      }
    });
  };

  wrap.querySelectorAll('[data-remove-partner]').forEach(bindRemove);

  if (add) {
    add.addEventListener('click', () => {
      const row = document.createElement('div');
      row.className = 'partner-row';
      row.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin-bottom: 8px;';
      row.innerHTML = '<input type="text" name="partner_name" placeholder="Partner name">'
        + '<input type="text" name="partner_url" placeholder="https://example.org (optional)">'
        + '<button type="button" class="button button--ghost button--sm" data-remove-partner>Remove</button>';
      rows.appendChild(row);
      bindRemove(row.querySelector('[data-remove-partner]'));
      row.querySelector('input').focus();
    });
  }
})();


/* Navigation menu rows */
(() => {
  const wrap = document.querySelector('[data-menu]');
  if (!wrap) return;

  const rows = wrap.querySelector('[data-menu-rows]');
  const add = wrap.querySelector('[data-add-menu]');

  const bind = (button) => {
    button.addEventListener('click', () => {
      if (rows.children.length > 1) button.closest('.partner-row').remove();
      else button.closest('.partner-row').querySelectorAll('input').forEach((input) => { input.value = ''; });
    });
  };

  wrap.querySelectorAll('[data-remove-menu]').forEach(bind);

  add.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'partner-row';
    row.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr auto; gap: 8px; margin-bottom: 8px;';
    row.innerHTML = '<input type="text" name="menu_label" placeholder="Label">'
      + '<input type="text" name="menu_url" placeholder="/about">'
      + '<button type="button" class="button button--ghost button--sm" data-remove-menu>Remove</button>';
    rows.appendChild(row);
    bind(row.querySelector('[data-remove-menu]'));
    row.querySelector('input').focus();
  });
})();


/* Repeatable settings blocks (values, steps, results, needs, questions…) */
(() => {
  document.querySelectorAll('[data-repeater]').forEach((wrap) => {
    const rows = wrap.querySelector('[data-rows]');
    const template = wrap.querySelector('template[data-template]');

    if (!rows || !template) return;

    /* Keep long cell text readable instead of hiding it behind a scrollbar. */
    const grow = (field) => {
      if (field.tagName !== 'TEXTAREA') return;
      field.style.height = 'auto';
      field.style.height = Math.max(62, field.scrollHeight + 2) + 'px';
    };

    const bindCell = (row) => {
      row.querySelectorAll('textarea').forEach((field) => {
        grow(field);
        field.addEventListener('input', () => grow(field));
      });
    };

    const bindRemove = (row) => {
      const remove = row.querySelector('[data-remove]');
      if (!remove) return;

      remove.addEventListener('click', () => {
        const all = rows.querySelectorAll('[data-row]');
        if (all.length > 1) {
          row.remove();
          return;
        }

        row.querySelectorAll('input, textarea').forEach((field) => { field.value = ''; });
        row.querySelectorAll('select').forEach((field) => { field.selectedIndex = 0; });
        bindCell(row);
      });
    };

    rows.querySelectorAll('[data-row]').forEach((row) => {
      bindCell(row);
      bindRemove(row);
    });

    const add = wrap.querySelector('[data-add]');
    if (!add) return;

    add.addEventListener('click', () => {
      const holder = document.createElement('div');
      holder.appendChild(template.content.cloneNode(true));
      const row = holder.firstElementChild;
      rows.appendChild(row);
      bindCell(row);
      bindRemove(row);

      const first = row.querySelector('input, textarea');
      if (first) first.focus();
    });
  });
})();

