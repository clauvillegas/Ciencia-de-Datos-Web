// items/_nb-renderer.js
async function renderNotebook({ src, title, desc }) {
  const yEl = document.getElementById('y');
  if (yEl) yEl.textContent = new Date().getFullYear();

  const h1 = document.getElementById('nb-title');
  const pdesc = document.getElementById('nb-desc');
  const where = document.getElementById('content');
  const toc = document.getElementById('toc');

  if (h1) h1.textContent = title || 'Notebook';
  if (pdesc) pdesc.textContent = desc || src;

  const addTOC = (id, label) => {
    if (!toc) return;
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = label;
    toc.appendChild(a);
  };

  const addCopyBtn = (text, label = 'Copiar') => {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = label;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text);
        const old = btn.textContent; btn.textContent = '¡Copiado!';
        setTimeout(()=>btn.textContent = old, 1400);
      } catch {}
    });
    return btn;
  };

  const safeJoin = v => Array.isArray(v) ? v.join('') : (v || '');

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('No se pudo descargar el notebook');
    const nb = await res.json();

    let block = 0;
    for (const cell of (nb.cells || [])) {
      if (cell.cell_type === 'markdown') {
        const md = document.createElement('section');
        md.className = 'nb-md';
        md.innerHTML = marked.parse(safeJoin(cell.source));
        where.appendChild(md);
        continue;
      }

      if (cell.cell_type === 'code') {
        block += 1;
        const codeText = safeJoin(cell.source);

        const sec = document.createElement('section');
        sec.className = 'example';
        sec.id = `b${block}`;
        const h2 = document.createElement('h2');
        h2.className = 'title';
        h2.textContent = `Bloque de código #${block}`;
        addTOC(sec.id, `Bloque #${block}`);

        const tools = document.createElement('div');
        tools.className = 'toolbar';
        tools.appendChild(addCopyBtn(codeText, 'Copiar bloque'));

        const pre = document.createElement('pre');
        pre.className = 'line-numbers';
        const code = document.createElement('code');
        code.className = 'language-python';
        code.textContent = codeText;
        pre.appendChild(code);

        const outputsWrap = document.createElement('div');
        outputsWrap.className = 'outputs';

        // Render outputs
        for (const out of (cell.outputs || [])) {
          // stream (stdout/stderr)
          if (out.output_type === 'stream') {
            const preo = document.createElement('pre');
            preo.className = 'output';
            preo.textContent = safeJoin(out.text);
            outputsWrap.appendChild(preo);
            continue;
          }

          // errores
          if (out.output_type === 'error') {
            const preo = document.createElement('pre');
            preo.className = 'output error';
            preo.textContent = (out.ename || '') + ': ' + (out.evalue || '') +
              (out.traceback ? '\n' + out.traceback.join('\n') : '');
            outputsWrap.appendChild(preo);
            continue;
          }

          // execute_result / display_data
          const data = out.data || {};
          if (data['text/plain']) {
            const preo = document.createElement('pre');
            preo.className = 'output';
            preo.textContent = safeJoin(data['text/plain']);
            outputsWrap.appendChild(preo);
          }
          if (data['text/html']) {
            const div = document.createElement('div');
            div.className = 'nb-html';
            div.innerHTML = safeJoin(data['text/html']); // confías en tu propio notebook
            outputsWrap.appendChild(div);
          }
          if (data['image/png']) {
            const img = document.createElement('img');
            const b64 = safeJoin(data['image/png']).replace(/\n/g,'');
            img.src = `data:image/png;base64,${b64}`;
            img.alt = 'Salida (PNG)';
            img.className = 'nb-img';
            outputsWrap.appendChild(img);
          }
          if (data['image/svg+xml']) {
            const div = document.createElement('div');
            div.className = 'nb-svg';
            const svg = Array.isArray(data['image/svg+xml']) ? data['image/svg+xml'].join('') : data['image/svg+xml'];
            div.innerHTML = svg;
            outputsWrap.appendChild(div);
          }
        }

        sec.appendChild(h2);
        sec.appendChild(tools);
        sec.appendChild(pre);
        sec.appendChild(outputsWrap);
        const back = document.createElement('div');
        back.className = 'top';
        back.innerHTML = `<a href="#toc">↑ volver al índice</a>`;
        sec.appendChild(back);

        where.appendChild(sec);

        // Resaltado para este bloque
        Prism.highlightElement(code);
      }
    }

    if (block === 0) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No se detectaron celdas de código.';
      where.appendChild(p);
    }

  } catch (e) {
    const err = document.createElement('p');
    err.className = 'muted';
    err.textContent = 'Error cargando el notebook. Verifica la ruta y que el archivo esté publicado en esta web.';
    where.appendChild(err);
  }
}
