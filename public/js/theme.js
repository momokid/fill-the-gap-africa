/**
 * Fill The Gap Africa — theme behaviour.
 * No dependencies. Everything degrades gracefully.
 */
(function () {
	'use strict';

	var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ------------------------------------------------------------------ */
	/* Sticky header state                                                 */
	/* ------------------------------------------------------------------ */
	var header = document.querySelector('[data-header]');

	if (header) {
		var updateHeader = function () {
			header.classList.toggle('is-scrolled', window.pageYOffset > 8);
		};

		updateHeader();
		window.addEventListener('scroll', updateHeader, { passive: true });
	}

	/* ------------------------------------------------------------------ */
	/* Mobile navigation                                                   */
	/* ------------------------------------------------------------------ */
	var toggle = document.querySelector('[data-nav-toggle]');
	var nav = document.getElementById('site-navigation');

	if (toggle && nav) {
		var setOpen = function (open) {
			document.body.classList.toggle('nav-open', open);
			toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

			if (open) {
				var firstLink = nav.querySelector('a');
				if (firstLink) {
					firstLink.focus({ preventScroll: true });
				}
			}
		};

		toggle.addEventListener('click', function () {
			setOpen(!document.body.classList.contains('nav-open'));
		});

		nav.querySelectorAll('[data-nav-close]').forEach(function (closeButton) {
			closeButton.addEventListener('click', function () {
				setOpen(false);
				toggle.focus();
			});
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
				setOpen(false);
				toggle.focus();
			}
		});

		document.addEventListener('click', function (event) {
			if (!document.body.classList.contains('nav-open')) {
				return;
			}

			if (nav.contains(event.target) || toggle.contains(event.target)) {
				return;
			}

			setOpen(false);
		});

		nav.addEventListener('click', function (event) {
			if (event.target.closest('a') && window.innerWidth <= 960) {
				setOpen(false);
			}
		});

		window.addEventListener('resize', function () {
			if (window.innerWidth > 960) {
				setOpen(false);
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/* Copy-to-clipboard (bank / mobile money details)                     */
	/* ------------------------------------------------------------------ */
	var copyButtons = document.querySelectorAll('[data-copy]');

	copyButtons.forEach(function (button) {
		button.addEventListener('click', function () {
			var value = button.getAttribute('data-copy') || '';
			var label = button.querySelector('[data-copy-label]');
			var original = label ? label.textContent : '';
			var copied = window.ftgaData && window.ftgaData.copied ? window.ftgaData.copied : 'Copied';

			var done = function () {
				if (!label) {
					return;
				}
				label.textContent = copied;
				window.setTimeout(function () {
					label.textContent = original;
				}, 2000);
			};

			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(value).then(done).catch(function () {});
				return;
			}

			var temp = document.createElement('textarea');
			temp.value = value;
			temp.setAttribute('readonly', '');
			temp.style.position = 'absolute';
			temp.style.left = '-9999px';
			document.body.appendChild(temp);
			temp.select();
			try {
				document.execCommand('copy');
				done();
			} catch (error) {
				/* Copy not available — the value is visible on screen. */
			}
			document.body.removeChild(temp);
		});
	});

	/* ------------------------------------------------------------------ */
	/* Back to top                                                         */
	/* ------------------------------------------------------------------ */
	document.querySelectorAll('[data-back-to-top]').forEach(function (link) {
		link.addEventListener('click', function (event) {
			event.preventDefault();
			window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
		});
	});

	/* ------------------------------------------------------------------ */
	/* Current year in the footer legal line                               */
	/* ------------------------------------------------------------------ */
	document.querySelectorAll('[data-year]').forEach(function (node) {
		node.textContent = String(new Date().getFullYear());
	});
})();
