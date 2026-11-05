(function (global) {
  'use strict';

  var templateFiles = {
    stockTable: ['stock-table.html', 'tpl-stock'],
    orderForm: ['order-form.html', 'tpl-order'],
    doTracking: ['do-tracking.html', 'tpl-tracking'],
    statusBadge: ['status-badge.html', 'tpl-status-badge'],
    statusLabel: ['status-badge.html', 'tpl-status-label'],
    appModal: ['app-modal.html', 'tpl-app-modal']
  };

  // Mengambil isi file dan memberi error jelas jika file tidak berhasil dibaca.
  function fetchText(path) {
    return fetch(path).then(function (response) {
      if (!response.ok) {
        throw new Error('Gagal membaca ' + path + ' (HTTP ' + response.status + ').');
      }
      return response.text();
    });
  }

  // Mengambil isi <template> berdasarkan ID-nya.
  function fetchTemplate(path, templateId) {
    return fetchText(path).then(function (html) {
      var documentFragment = document.createElement('template');
      documentFragment.innerHTML = html;
      var template = documentFragment.content.querySelector('#' + templateId);
      if (!template) {
        throw new Error('Template #' + templateId + ' tidak ditemukan pada ' + path + '.');
      }
      return template.innerHTML.trim();
    });
  }

  global.SITTA = global.SITTA || {};
  global.SITTA.loadAppData = function () {
    // Data katalog dan seluruh template dimuat sebelum komponen dibuat.
    var jobs = [fetchText('data/dataBahanAjar.json')];
    Object.keys(templateFiles).forEach(function (name) {
      var definition = templateFiles[name];
      jobs.push(fetchTemplate(definition[0], definition[1]));
    });

    return Promise.all(jobs).then(function (results) {
      var templates = {};
      Object.keys(templateFiles).forEach(function (name, index) {
        templates[name] = results[index + 1];
      });
      global.SITTA.templates = templates;
      return JSON.parse(results[0]);
    });
  };
}(window));