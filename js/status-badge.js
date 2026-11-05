(function (global) {
  'use strict';

  global.SITTA = global.SITTA || {};
  global.SITTA.registerStatusComponents = function (Vue) {
    // Badge stok menunjukkan kondisi stok; badge status menunjukkan kondisi pengiriman.
    Vue.component('ba-status-badge', {
      props: {
        qty: { type: Number, default: null },
        safety: { type: Number, default: null },
        status: { type: String, default: '' }
      },
      computed: {
        state: function () {
          if (this.status) {
            if (this.status === 'Terkirim') return 'success';
            if (this.status === 'Dibatalkan') return 'neutral';
            return 'info';
          }
          if (this.qty === 0) return 'danger';
          return this.qty < this.safety ? 'warning' : 'success';
        },
        label: function () {
          if (this.status) return this.status;
          if (this.qty === 0) return 'Kosong';
          return this.qty < this.safety ? 'Menipis' : 'Aman';
        },
        className: function () {
          return 'badge badge-' + this.state;
        }
      },
      template: global.SITTA.templates.statusBadge
    });

    Vue.component('ba-status-label', {
      props: { status: { type: String, required: true } },
      computed: {
        state: function () {
          if (this.status === 'Terkirim') return 'success';
          if (this.status === 'Dibatalkan') return 'neutral';
          return 'info';
        },
        className: function () {
          return 'badge badge-' + this.state;
        }
      },
      template: global.SITTA.templates.statusLabel
    });
  };
}(window));