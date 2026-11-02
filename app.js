import { ID3Writer } from './vendor/browser-id3-writer/browser-id3-writer.mjs';

const byId = (id) => document.getElementById(id);
const form = byId('tag-form');
const fields = {
  title: byId('title'),
  artist: byId('artist'),
  album: byId('album'),
  albumArtist: byId('album-artist'),
  year: byId('year'),
  month: byId('month'),
  track: byId('track'),
  genre: byId('genre'),
  comment: byId('comment'),
};

const state = {
  file: null,
  cover: null,
  coverType: '',
  coverUrl: '',
  audioUrl: '',
  releaseDay: '00',
  busy: false,
};

function valueOf(tag) {
  const value = tag && typeof tag === 'object' && 'data' in tag ? tag.data : tag;
  if (Array.isArray(value)) return value.join('; ');
  return value == null ? '' : String(value);
}

function firstValue(...values) {
  return values.map(valueOf).find((value) => value.trim()) || '';
}

function dateParts(tags) {
  const date = firstValue(tags.TDRC, tags.date);
  const year = firstValue(tags.year, tags.TYER, date.match(/\b\d{4}\b/)?.[0]);
  const tdat = firstValue(tags.TDAT);
  const monthFromDate = date.match(/^\d{4}[-/.](\d{1,2})/);
  const month = monthFromDate?.[1] || (tdat.length >= 4 ? tdat.slice(-2) : '');
  const day = tdat.length >= 4 ? tdat.slice(0, 2) : date.match(/^\d{4}[-/.]\d{1,2}[-/.](\d{1,2})/)?.[1];
  return { year: year.match(/\d{4}/)?.[0] || '', month, day: day || '00' };
}

function setStatus(message, kind = 'info') {
  const status = byId('status-message');
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = !message;
}

function setBusy(isBusy) {
  state.busy = isBusy;
  byId('save-button').disabled = isBusy || !state.file;
  byId('open-button').disabled = isBusy;
  byId('replace-button').disabled = isBusy;
  byId('drop-zone').setAttribute('aria-busy', String(isBusy));
  byId('save-label').textContent = isBusy ? 'Hazırlanıyor...' : 'Düzenlenmiş MP3\'ü indir';
}

function tagText(tags, ...names) {
  return firstValue(...names.map((name) => tags[name]));
}

function fileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function safeFilenamePart(value) {
  return String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
}

function downloadFilename() {
  const year = fields.year.value.trim();
  const month = fields.month.value.trim();
  const track = fields.track.value.trim().split('/')[0].trim();
  const title = fields.title.value.trim();
  const artist = fields.artist.value.trim();
  const parts = [year, month, fields.album.value.trim(), track]
    .map(safeFilenamePart)
    .filter(Boolean);
  const titleArtist = [title, artist ? `(${artist})` : ''].filter(Boolean).join(' ');
  if (titleArtist) parts.push(safeFilenamePart(titleArtist));

  const name = parts.filter(Boolean).join(' - ');
  return `${name || safeFilenamePart(state.file?.name.replace(/\.mp3$/i, '')) || 'isimsiz'}.mp3`;
}

function updateFilenamePreview() {
  byId('filename-preview').textContent = downloadFilename();
}

function updateCoverPreview(blob) {
  if (state.coverUrl) URL.revokeObjectURL(state.coverUrl);
  state.coverUrl = '';

  const image = byId('cover-image');
  const empty = byId('cover-empty');
  if (!blob) {
    image.hidden = true;
    image.removeAttribute('src');
    empty.hidden = false;
    return;
  }

  state.coverUrl = URL.createObjectURL(blob);
  image.src = state.coverUrl;
  image.hidden = false;
  empty.hidden = true;
}

function updateTrackSummary(file) {
  byId('file-name').textContent = file.name;
  byId('file-size').textContent = fileSize(file.size);
  byId('file-details').hidden = false;
  byId('empty-state').hidden = true;
  form.hidden = false;

  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = URL.createObjectURL(file);
  byId('audio-player').src = state.audioUrl;
}

function readTags(file) {
  return new Promise((resolve, reject) => {
    if (!window.jsmediatags) {
      reject(new Error('Etiket okuyucu yüklenemedi. İnternet bağlantınızı kontrol edin.'));
      return;
    }
    window.jsmediatags.read(file, {
      onSuccess: ({ tags }) => resolve(tags || {}),
      onError: reject,
    });
  });
}

function populateFields(tags) {
  const date = dateParts(tags);
  state.releaseDay = date.day;
  fields.title.value = tagText(tags, 'title', 'TIT2');
  fields.artist.value = tagText(tags, 'artist', 'TPE1');
  fields.album.value = tagText(tags, 'album', 'TALB');
  fields.albumArtist.value = tagText(tags, 'albumArtist', 'TPE2');
  fields.year.value = date.year;
  fields.month.value = date.month;
  fields.track.value = tagText(tags, 'track', 'TRCK');
  fields.genre.value = tagText(tags, 'genre', 'TCON');
  fields.comment.value = tagText(tags, 'comment', 'COMM');

  const picture = tags.picture;
  if (picture?.data?.length) {
    const bytes = new Uint8Array(picture.data);
    state.cover = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    state.coverType = picture.format || 'image/jpeg';
    updateCoverPreview(new Blob([state.cover], { type: state.coverType }));
  } else {
    state.cover = null;
    state.coverType = '';
    updateCoverPreview(null);
  }
  updateFilenamePreview();
}

async function loadFile(file) {
  if (!file || !/\.mp3$/i.test(file.name)) {
    setStatus('Lütfen .mp3 uzantılı bir dosya seçin.', 'error');
    return;
  }

  state.file = file;
  setBusy(true);
  setStatus('Etiketler okunuyor...');
  updateTrackSummary(file);
  form.reset();
  state.cover = null;
  state.releaseDay = '00';
  updateCoverPreview(null);

  try {
    const tags = await readTags(file);
    populateFields(tags);
    setStatus('Etiketler hazır. Değişiklikler bu tarayıcıda kalır.');
  } catch (error) {
    populateFields({});
    setStatus(`Etiketler okunamadı; alanları elle doldurabilirsiniz. ${error?.info || error?.message || ''}`.trim(), 'warning');
  } finally {
    setBusy(false);
    updateFilenamePreview();
  }
}

function arrayBufferFromFile(file) {
  return file.arrayBuffer();
}

function setTextFrame(writer, frame, value) {
  const clean = String(value || '').trim();
  if (clean) writer.setFrame(frame, clean);
}

async function saveFile() {
  if (!state.file || state.busy) return;
  setBusy(true);
  setStatus('MP3 hazırlanıyor...');

  try {
    const writer = new ID3Writer(await arrayBufferFromFile(state.file));
    setTextFrame(writer, 'TIT2', fields.title.value);
    setTextFrame(writer, 'TALB', fields.album.value);
    setTextFrame(writer, 'TPE2', fields.albumArtist.value);
    setTextFrame(writer, 'TRCK', fields.track.value);

    if (fields.artist.value.trim()) writer.setFrame('TPE1', [fields.artist.value.trim()]);
    if (fields.genre.value.trim()) writer.setFrame('TCON', [fields.genre.value.trim()]);
    if (/^\d{4}$/.test(fields.year.value.trim())) writer.setFrame('TYER', Number(fields.year.value));
    if (/^(0?[1-9]|1[0-2])$/.test(fields.month.value.trim())) {
      writer.setFrame('TDAT', `${state.releaseDay.padStart(2, '0')}${fields.month.value.padStart(2, '0')}`);
    }
    if (fields.comment.value.trim()) {
      writer.setFrame('COMM', { description: '', text: fields.comment.value.trim(), language: 'tur' });
    }
    if (state.cover) {
      writer.setFrame('APIC', { type: 3, data: state.cover, description: '' });
    }

    writer.addTag();
    const url = URL.createObjectURL(writer.getBlob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = downloadFilename();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus('MP3 hazırlandı ve indirme başlatıldı.', 'success');
  } catch (error) {
    setStatus(`Dosya oluşturulamadı: ${error?.message || 'Bilinmeyen hata'}`, 'error');
  } finally {
    setBusy(false);
  }
}

function handleCoverFile(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    setStatus('Kapak görseli JPG, PNG veya WebP olmalıdır.', 'error');
    return;
  }
  state.coverType = file.type;
  file.arrayBuffer().then((buffer) => {
    state.cover = buffer;
    updateCoverPreview(file);
    setStatus('Kapak görseli güncellendi.');
  }).catch(() => setStatus('Kapak görseli okunamadı.', 'error'));
}

byId('open-button').addEventListener('click', () => byId('file-input').click());
byId('replace-button').addEventListener('click', () => byId('file-input').click());
byId('file-input').addEventListener('change', (event) => {
  loadFile(event.target.files?.[0]);
  event.target.value = '';
});
byId('save-button').addEventListener('click', saveFile);
byId('cover-button').addEventListener('click', () => byId('cover-input').click());
byId('cover-input').addEventListener('change', (event) => handleCoverFile(event.target.files?.[0]));
byId('remove-cover').addEventListener('click', () => {
  state.cover = null;
  state.coverType = '';
  updateCoverPreview(null);
  setStatus('Kapak kaldırıldı.');
});

Object.values(fields).forEach((field) => field.addEventListener('input', updateFilenamePreview));

const dropZone = byId('drop-zone');
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.dataset.dragging = 'true';
});
dropZone.addEventListener('dragleave', (event) => {
  if (!dropZone.contains(event.relatedTarget)) delete dropZone.dataset.dragging;
});
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  delete dropZone.dataset.dragging;
  loadFile(event.dataTransfer?.files?.[0]);
});

window.addEventListener('beforeunload', () => {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  if (state.coverUrl) URL.revokeObjectURL(state.coverUrl);
});