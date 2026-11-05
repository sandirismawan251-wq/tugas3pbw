(function (global) {
  'use strict';

  global.SITTA = global.SITTA || {};
  global.SITTA.registerModalComponent = function (Vue) {
    // Modal dipakai ulang untuk formulir dan konfirmasi pada halaman stok.
    Vue.component('ba-app-modal', {
      props: {
        title: { type: String, required: true }
      },
      template: global.SITTA.templates.appModal
    });
  };
}(window));