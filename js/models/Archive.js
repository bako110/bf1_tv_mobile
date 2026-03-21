/**
 * Modèle Archive - Harmonise l'affichage des archives
 */

export class Archive {
  constructor(data = {}) {
    this.id = data.id || data._id;
    this.title = data.title || 'Sans titre';
    this.guestName = data.guest_name || data.guestName || 'Invité';
    this.guestRole = data.guest_role || data.guestRole || '';
    this.image = data.image || data.image_url || '';
    this.thumbnail = data.thumbnail || '';
    this.videoUrl = data.video_url || data.videoUrl || '';
    this.description = data.description || '';
    this.duration = data.duration_minutes || data.duration || 30;
    this.isPremium = data.is_premium ?? data.isPremium ?? false;
    this.price = data.price || 0;
    this.views = data.views || 0;
    this.rating = data.rating || 0;
    this.category = data.category || '';
    this.tags = data.tags || [];
    this.archivedDate = data.archived_date || data.archivedDate || new Date().toISOString();
    this.createdAt = data.created_at || data.createdAt || new Date().toISOString();
  }

  // Échapper HTML
  static escape(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Formater date
  static formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  // Formater durée
  static formatDuration(minutes) {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }

  // Afficher pour carte
  renderCard() {
    return `
      <div style="border-radius:8px;overflow:hidden;background:#1a1a1a;margin-bottom:12px;">
        ${this.image ? `<img src="${Archive.escape(this.image)}" style="width:100%;height:160px;object-fit:cover;" />` : ''}
        <div style="padding:12px;">
          <h3 style="margin:0 0 8px;font-size:14px;color:#fff;font-weight:600;">${Archive.escape(this.title)}</h3>
          <p style="margin:0 0 6px;font-size:12px;color:#888;">${Archive.escape(this.guestName)} ${this.guestRole ? `- ${Archive.escape(this.guestRole)}` : ''}</p>
          <div style="display:flex;gap:8px;font-size:11px;color:#666;">
            <span>👁️ ${this.views}</span>
            <span>⭐ ${this.rating.toFixed(1)}</span>
            ${this.duration ? `<span>⏱️ ${Archive.formatDuration(this.duration)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  // Afficher détails
  renderDetail() {
    return `
      <div>
        ${this.image ? `<img src="${Archive.escape(this.image)}" style="width:100%;border-radius:8px;margin-bottom:16px;" />` : ''}
        <h1 style="font-size:20px;font-weight:700;color:#fff;margin-bottom:12px;">${Archive.escape(this.title)}</h1>
        ${this.category ? `<span style="background:#E23E3E;color:#fff;padding:4px 8px;border-radius:4px;font-size:12px;">${Archive.escape(this.category)}</span>` : ''}
        <div style="margin:12px 0;font-size:13px;color:#888;">
          <p>Invité: <strong>${Archive.escape(this.guestName)}</strong> ${this.guestRole ? `(${Archive.escape(this.guestRole)})` : ''}</p>
          <p>Date: <strong>${Archive.formatDate(this.archivedDate)}</strong></p>
          <p>Durée: <strong>${Archive.formatDuration(this.duration)}</strong></p>
        </div>
        <div style="background:#1a1a1a;padding:12px;border-radius:8px;margin:16px 0;color:#ccc;font-size:14px;line-height:1.6;">
          ${Archive.escape(this.description)}
        </div>
      </div>`;
  }
}
