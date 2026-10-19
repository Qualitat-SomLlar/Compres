# Protegir el webhook de correu (Google Apps Script)

La URL del webhook viatja dins del JavaScript públic de l'aplicació, així que qualsevol persona
la pot fer servir per enviar correus des del compte de Google de l'entitat. Cal que l'script
rebutgi les peticions que no vinguin de l'aplicació i que només enviï a adreces `@somllar.cat`.

## 1. Afegir la validació al `doPost`

A l'editor de l'Apps Script, al principi de la funció `doPost(e)` existent, afegeix:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // 1) Clau compartida: ha de coincidir amb VITE_EMAIL_WEBHOOK_TOKEN de Vercel
  var expected = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  if (!expected || data.token !== expected) {
    return ContentService.createTextOutput('forbidden');
  }

  // 2) Només destinataris de l'entitat
  var to = String(data.to || data.recipient || data.email || '').toLowerCase().trim();
  if (!/^[^@\s,;]+@somllar\.cat$/.test(to)) {
    return ContentService.createTextOutput('forbidden');
  }

  // 3) Límit bàsic d'enviaments per minut
  var cache = CacheService.getScriptCache();
  var key = 'sent_' + Math.floor(Date.now() / 60000);
  var sent = Number(cache.get(key) || 0);
  if (sent > 30) {
    return ContentService.createTextOutput('rate-limited');
  }
  cache.put(key, String(sent + 1), 120);

  // ... a partir d'aquí, el codi d'enviament que ja tens (MailApp/GmailApp.sendEmail) ...
}
```

Si al panell de notificacions hi tens configurat algun destinatari extern a `@somllar.cat`,
afegeix-lo explícitament a l'expressió regular; si no, deixarà de rebre correus.

La clau compartida també és visible al navegador, així que no és una contrasenya. El que de
debò protegeix és el filtre de destinataris `@somllar.cat` i el límit d'enviaments.

## 2. Crear la clau

1. A l'Apps Script: **Configuració del projecte → Propietats de l'script → Afegeix una propietat**:
   `WEBHOOK_TOKEN` = una cadena llarga aleatòria.
2. A Vercel (**Settings → Environment Variables**, entorn *Production*):
   - `VITE_EMAIL_WEBHOOK_TOKEN` = la mateixa cadena.
   - `VITE_APP_URL` = `https://compres-somllar.vercel.app`.

## 3. Publicar una versió nova amb URL nova

1. **Implementa → Nova implementació** (aplicació web, s'executa com tu, accés: qualsevol persona).
2. Copia la URL nova i posa-la a Vercel com a `VITE_GOOGLE_SCRIPT_WEBHOOK_URL`.
3. **Implementa → Gestiona les implementacions** i arxiva la implementació antiga
   (`AKfycbx9_0gw…`), perquè la URL antiga deixi de funcionar.
4. A Vercel, **Redeploy** de l'últim desplegament perquè agafi les variables noves.
5. Treu la URL antiga que hi ha com a valor per defecte a `src/services/emailService.ts`.
