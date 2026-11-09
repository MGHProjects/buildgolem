// Textos legales de BuildGolem (español e inglés). Cada sección: h (título), p (párrafos), list (puntos) o table.
// Si cambia lo que hace la app (datos, proveedores, plazos), hay que cambiar esto a la vez.
export const UPDATED = '2026-11-09';
export const OWNER = { name: 'MGH Projects', email: 'privacidad@dualix.io', site: 'buildgolem.dualix.io' };

const COOKIES = {
  es: { head: ['Nombre', 'Dónde', 'Para qué', 'Duración'], rows: [
    ['cm_session', 'Cookie (HttpOnly)', 'Mantener tu sesión iniciada. Técnica y necesaria.', '60 días que se renuevan al usar la app, o hasta cerrar el navegador si no marcas "Mantener la sesión iniciada"'],
    ['cm_oauth', 'Cookie (HttpOnly)', 'Proteger la entrada con Google o Discord (comprueba que la vuelta viene de tu propio intento).', '10 minutos'],
    ['cm-theme, cm-lang', 'localStorage', 'Recordar el tema y el idioma que eliges.', 'Hasta que borres los datos del sitio'],
    ['cm-last-login', 'localStorage', 'Marcar el último método de entrada y rellenar tu email en este navegador.', 'Hasta que borres los datos del sitio'],
    ['__cf_bm', 'Cookie de Cloudflare', 'Puede ponerla Cloudflare para filtrar tráfico automatizado. Técnica.', '30 minutos'],
  ] },
  en: { head: ['Name', 'Where', 'Purpose', 'Duration'], rows: [
    ['cm_session', 'Cookie (HttpOnly)', 'Keeps you signed in. Technical and necessary.', '60 days, renewed while you use the app, or until you close the browser if you untick "Keep me signed in"'],
    ['cm_oauth', 'Cookie (HttpOnly)', 'Protects Google or Discord sign-in (checks that the return comes from your own attempt).', '10 minutes'],
    ['cm-theme, cm-lang', 'localStorage', 'Remembers the theme and language you choose.', 'Until you clear the site data'],
    ['cm-last-login', 'localStorage', 'Marks the last sign-in method and fills in your email on this browser.', 'Until you clear the site data'],
    ['__cf_bm', 'Cloudflare cookie', 'Cloudflare may set it to filter automated traffic. Technical.', '30 minutes'],
  ] },
};

const PROVIDERS = {
  es: { head: ['Quién', 'Qué recibe', 'Dónde', 'Por qué'], rows: [
    ['Cloudflare, Inc.', 'Tu IP y el tráfico cifrado hacia la web', 'EE. UU. y su red mundial', 'Conectar la web con internet (túnel y DNS) y protegerla de ataques'],
    ['Resend, Inc.', 'Tu email y el texto del correo', 'EE. UU.', 'Enviar los correos de confirmación y de contraseña'],
    ['Google LLC / Discord Inc.', 'Solo si entras con ellos: nos dan tu id, email, nombre y si el email está confirmado', 'EE. UU.', 'Entrar sin contraseña'],
    ['El proveedor de IA que tú eliges', 'Lo que escribes a los agentes y los datos del diseño y del modpack que necesitan', 'Depende del proveedor (EE. UU., UE, China…)', 'Responder a tu conversación con tu propia clave'],
    ['Modrinth', 'Tu IP, desde tu navegador, cuando buscas un modpack o ves sus iconos', 'EE. UU.', 'Buscar e importar modpacks'],
  ] },
  en: { head: ['Who', 'What they get', 'Where', 'Why'], rows: [
    ['Cloudflare, Inc.', 'Your IP and the encrypted traffic to the site', 'USA and its global network', 'Connect the site to the internet (tunnel and DNS) and protect it from attacks'],
    ['Resend, Inc.', 'Your email and the message text', 'USA', 'Send confirmation and password emails'],
    ['Google LLC / Discord Inc.', 'Only if you sign in with them: your id, email, name and whether the email is confirmed', 'USA', 'Sign in without a password'],
    ['The AI provider you choose', 'What you write to the agents and the design and modpack data they need', 'Depends on the provider (USA, EU, China…)', 'Answer your conversation with your own key'],
    ['Modrinth', 'Your IP, from your browser, when you search a modpack or see its icons', 'USA', 'Search and import modpacks'],
  ] },
};

export const LEGAL = {
  privacy: {
    es: {
      title: 'Política de privacidad',
      intro: 'Qué datos guarda BuildGolem, para qué, cuánto tiempo y cómo los controlas. Sin publicidad, sin analítica y sin vender datos a nadie.',
      sections: [
        { id: 'responsable', h: 'Quién es el responsable', p: [`${OWNER.name} es responsable de los datos de ${OWNER.site}. Para cualquier cosa sobre tus datos escribe a ${OWNER.email}: te contestamos en un mes como máximo.`] },
        { id: 'datos', h: 'Qué datos guardamos', list: [
          'Cuenta: email, nombre, un alias público generado a partir del nombre, idioma, si has confirmado el email y la contraseña guardada con scrypt (nunca en claro). Si entras con Google o Discord, su identificador de usuario y el email que nos dan, sin contraseña.',
          'Sesiones: un identificador cifrado (sha256) de cada sesión, cuándo caduca, la IP y el navegador desde el que se abrió.',
          'Lo que creas: tus diseños (privados, ocultos con enlace o públicos), sus conversaciones con los agentes y los modpacks que subes o importas, con el índice que hacemos de sus bloques, recetas y texturas.',
          'Claves de IA: las claves de API que añades, cifradas con AES-256-GCM. Solo se descifran en el servidor para llamar al proveedor que elegiste; nunca vuelven a tu navegador.',
          'Tokens personales: guardamos solo su sha256, su nombre, permisos y la fecha de último uso.',
          'Registro de seguridad: entradas, intentos fallidos, cambios de contraseña o de visibilidad, con la IP y la fecha.',
        ] },
        { id: 'para-que', h: 'Para qué y con qué base', table: { head: ['Uso', 'Base legal (RGPD art. 6)'], rows: [
          ['Darte la cuenta, guardar tus diseños y modpacks y que los agentes trabajen con ellos', 'Contrato: es el servicio que pides (6.1.b)'],
          ['Enviar correos de confirmación y de contraseña', 'Contrato (6.1.b)'],
          ['Llamar al proveedor de IA que eliges con tu clave', 'Contrato y tu instrucción expresa (6.1.b)'],
          ['Registro de seguridad, límite de intentos por IP, proteger cuentas', 'Interés legítimo en la seguridad del servicio (6.1.f)'],
          ['Recordar tema, idioma y último método de entrada en tu navegador', 'Funciones que tú pides; no salen de tu equipo'],
          ['Cumplir obligaciones legales o peticiones de una autoridad', 'Obligación legal (6.1.c)'],
        ] }, p: ['No hacemos perfiles, ni publicidad, ni analítica, ni decisiones automatizadas sobre ti.'] },
        { id: 'quien', h: 'Con quién se comparten', table: PROVIDERS.es, p: [
          'Los diseños públicos los ve cualquiera, con tu nombre y alias pero sin tu email. Los ocultos, quien tenga el enlace.',
          'Con el proveedor de IA hablas tú con tu propia clave y tu propia cuenta: lo que le envías queda sujeto a sus condiciones. Elige uno cuyas condiciones aceptes.',
          'No vendemos ni cedemos datos a nadie más, salvo obligación legal.',
        ] },
        { id: 'transferencias', h: 'Transferencias fuera de la UE', p: [
          'El servidor está en España. Cloudflare, Resend, Google y Discord están en EE. UU. y se acogen al Marco de Privacidad de Datos UE-EE. UU. o a cláusulas contractuales tipo de la Comisión Europea.',
          'El proveedor de IA lo eliges tú. Si está en un país sin decisión de adecuación (por ejemplo, China), la transferencia se hace porque tú la pides para usar ese proveedor (RGPD art. 49.1.b).',
        ] },
        { id: 'plazos', h: 'Cuánto tiempo', list: [
          'Cuenta, diseños, modpacks, conversaciones, claves y tokens: mientras tengas la cuenta. Al borrarla desaparecen al momento de la base de datos.',
          'Copias de seguridad del servidor: hasta 30 días.',
          'Sesiones: hasta que caducan (60 días sin uso, o 12 horas si no marcaste mantenerla); las caducadas se borran cada día.',
          'Enlaces de correo: 24 horas (confirmación) y 1 hora (contraseña); los caducados se borran cada día.',
          'Registro de seguridad: 12 meses.',
          'Límites de intentos por IP: 15 minutos, solo en memoria.',
        ] },
        { id: 'derechos', h: 'Tus derechos', p: [
          'Puedes acceder a tus datos, corregirlos, borrarlos, llevártelos, limitar su uso u oponerte a él. Desde Ajustes puedes cambiar tu nombre y contraseña, descargar todos tus datos en JSON y borrar la cuenta. Para lo demás, escribe a ' + OWNER.email + ' desde el email de tu cuenta.',
          'Si crees que no lo hacemos bien, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
        ] },
        { id: 'cookies', h: 'Cookies y almacenamiento local', p: ['Solo usamos cookies técnicas y preferencias que eliges tú, por eso no hay banner de consentimiento (LSSI art. 22.2). Puedes borrarlas desde tu navegador; sin cm_session tendrás que volver a entrar.'], table: COOKIES.es },
        { id: 'seguridad', h: 'Seguridad', list: [
          'Todo el tráfico va cifrado (HTTPS). Contraseñas con scrypt, claves de IA con AES-256-GCM atadas a tu cuenta y tokens guardados solo como hash.',
          'Cookies HttpOnly y SameSite, protección contra peticiones de otros sitios (CSRF), límite de intentos y cierre de todas las sesiones al cambiar la contraseña.',
          'El servidor no se conecta a direcciones privadas por petición de nadie (protección SSRF).',
          'Ningún sistema es infalible: si hubiera una brecha que te afecte, te avisaremos y lo comunicaremos a la AEPD en los plazos legales.',
        ] },
        { id: 'menores', h: 'Menores', p: ['Para crear una cuenta necesitas tener 14 años o más (LOPDGDD art. 7). Si eres menor de 14, necesitas el consentimiento de tus padres o tutores, que pueden escribirnos para ejercer tus derechos. Si sabemos que una cuenta es de un menor de 14 sin ese consentimiento, la borramos.'] },
        { id: 'cambios', h: 'Cambios', p: ['Si cambiamos algo importante te avisamos por email o en la app al menos 15 días antes. La fecha de arriba indica la última versión.'] },
      ],
    },
    en: {
      title: 'Privacy policy',
      intro: 'What data BuildGolem keeps, why, for how long and how you control it. No ads, no analytics and no selling data to anyone.',
      sections: [
        { id: 'responsable', h: 'Who is responsible', p: [`${OWNER.name} is the controller for ${OWNER.site}. For anything about your data, write to ${OWNER.email}: we answer within one month.`] },
        { id: 'datos', h: 'What we keep', list: [
          'Account: email, name, a public handle made from the name, language, whether your email is confirmed and your password hashed with scrypt (never in plain text). If you sign in with Google or Discord, their user id and the email they give us, with no password.',
          'Sessions: a hashed (sha256) id for each session, when it expires, and the IP and browser it was opened from.',
          'What you create: your designs (private, hidden link or public), their conversations with the agents and the modpacks you upload or import, with our index of their blocks, recipes and textures.',
          'AI keys: the API keys you add, encrypted with AES-256-GCM. They are only decrypted on the server to call the provider you chose; they never go back to your browser.',
          'Personal tokens: we keep only their sha256, name, permissions and last use date.',
          'Security log: sign-ins, failed attempts, password or visibility changes, with IP and date.',
        ] },
        { id: 'para-que', h: 'Why, and on what basis', table: { head: ['Use', 'Legal basis (GDPR art. 6)'], rows: [
          ['Give you an account, keep your designs and modpacks and let the agents work on them', 'Contract: it is the service you ask for (6.1.b)'],
          ['Send confirmation and password emails', 'Contract (6.1.b)'],
          ['Call the AI provider you choose with your key', 'Contract and your explicit instruction (6.1.b)'],
          ['Security log, per-IP attempt limits, protecting accounts', 'Legitimate interest in keeping the service secure (6.1.f)'],
          ['Remember theme, language and last sign-in method in your browser', 'Features you ask for; they stay on your device'],
          ['Meet legal obligations or requests from an authority', 'Legal obligation (6.1.c)'],
        ] }, p: ['We do no profiling, advertising, analytics or automated decisions about you.'] },
        { id: 'quien', h: 'Who it is shared with', table: PROVIDERS.en, p: [
          'Public designs are visible to anyone, with your name and handle but never your email. Hidden ones, to whoever has the link.',
          'With the AI provider you talk through your own key and your own account: what you send is subject to their terms. Pick one whose terms you accept.',
          'We do not sell or hand data to anyone else, unless the law requires it.',
        ] },
        { id: 'transferencias', h: 'Transfers outside the EU', p: [
          'The server is in Spain. Cloudflare, Resend, Google and Discord are in the USA and rely on the EU-US Data Privacy Framework or the European Commission standard contractual clauses.',
          'You choose the AI provider. If it is in a country without an adequacy decision (for example, China), the transfer happens because you ask for it to use that provider (GDPR art. 49.1.b).',
        ] },
        { id: 'plazos', h: 'How long', list: [
          'Account, designs, modpacks, conversations, keys and tokens: while you have the account. Deleting it removes them from the database at once.',
          'Server backups: up to 30 days.',
          'Sessions: until they expire (60 days unused, or 12 hours if you did not keep it); expired ones are deleted daily.',
          'Email links: 24 hours (confirmation) and 1 hour (password); expired ones are deleted daily.',
          'Security log: 12 months.',
          'Per-IP attempt limits: 15 minutes, in memory only.',
        ] },
        { id: 'derechos', h: 'Your rights', p: [
          'You can access, correct, delete or take your data, restrict its use or object to it. In Settings you can change your name and password, download all your data as JSON and delete the account. For anything else, write to ' + OWNER.email + ' from your account email.',
          'If you think we get it wrong, you can complain to the Spanish Data Protection Agency (aepd.es) or the authority where you live.',
        ] },
        { id: 'cookies', h: 'Cookies and local storage', p: ['We only use technical cookies and preferences you choose, which is why there is no consent banner (Spanish LSSI art. 22.2). You can clear them in your browser; without cm_session you will have to sign in again.'], table: COOKIES.en },
        { id: 'seguridad', h: 'Security', list: [
          'All traffic is encrypted (HTTPS). Passwords with scrypt, AI keys with AES-256-GCM bound to your account and tokens stored only as hashes.',
          'HttpOnly and SameSite cookies, protection against cross-site requests (CSRF), attempt limits and every session closed when the password changes.',
          'The server never connects to private addresses on anyone\'s request (SSRF protection).',
          'No system is flawless: if a breach affects you, we will tell you and report it to the authority within the legal deadlines.',
        ] },
        { id: 'menores', h: 'Children', p: ['You need to be 14 or older to create an account (Spanish law, LOPDGDD art. 7; check the age where you live). Under 14 you need your parents\' or guardians\' consent, and they can write to us to use your rights. If we learn an account belongs to someone under 14 without that consent, we delete it.'] },
        { id: 'cambios', h: 'Changes', p: ['If we change anything important we tell you by email or in the app at least 15 days before. The date at the top shows the latest version.'] },
      ],
    },
  },
  terms: {
    es: {
      title: 'Términos de uso',
      intro: 'Las reglas para usar BuildGolem. Están escritas para leerse en cinco minutos.',
      sections: [
        { id: 'quien', h: 'Quién presta el servicio', p: [`BuildGolem (${OWNER.site}) lo ofrece ${OWNER.name}. Contacto: ${OWNER.email}. BuildGolem no tiene relación con Mojang Studios ni con Microsoft; Minecraft es marca de Microsoft.`] },
        { id: 'cuenta', h: 'Tu cuenta', list: [
          'Necesitas 14 años o más, o el permiso de tus padres o tutores.',
          'Eres responsable de lo que se haga con tu cuenta, tus tokens personales y tus claves de IA. Si crees que alguien entró, cambia la contraseña: cierra todas las sesiones.',
          'Para publicar diseños en la galería tienes que confirmar tu email.',
        ] },
        { id: 'contenido', h: 'Lo que subes y lo que creas', list: [
          'Tus diseños son tuyos. Al hacerlos públicos o compartirlos con enlace nos permites mostrarlos en BuildGolem mientras sigan así; puedes cambiar la visibilidad o borrarlos cuando quieras.',
          'Los modpacks que subes deben ser tuyos o de uso permitido. Los mods, sus texturas y modelos son de sus autores: solo enseñamos en público las texturas de mods con licencia libre; el resto lo ve solo quien sube el modpack.',
          'No subas nada ilegal, que infrinja derechos de otros o que contenga malware.',
        ] },
        { id: 'ia', h: 'Agentes y claves de IA', list: [
          'Los agentes usan tu propia clave del proveedor que elijas. El coste, los límites y las condiciones de ese proveedor son cosa tuya con él.',
          'Los diseños y cálculos salen de los datos de tu modpack, pero pueden tener errores: compruébalos antes de gastar recursos en tu mundo.',
        ] },
        { id: 'uso', h: 'Uso justo', list: [
          'No intentes entrar en cuentas ajenas, saltarte los límites, sobrecargar el servidor ni usar BuildGolem para atacar a otros.',
          'Cada cuenta tiene un espacio máximo para modpacks (6 GB).',
          'Podemos suspender o borrar cuentas que incumplan estos términos, avisándote cuando sea posible.',
        ] },
        { id: 'servicio', h: 'El servicio', p: [
          'BuildGolem es gratuito y se ofrece tal cual. Intentamos que funcione siempre y que no se pierda nada, pero puede haber cortes o cambios. Haz tus propias copias de lo importante (exportar .nbt o descargar tus datos desde Ajustes).',
          'No respondemos de daños indirectos ni de pérdidas en tu mundo de Minecraft, salvo lo que la ley no permita excluir: si eres consumidor, conservas todos los derechos que te da la ley.',
        ] },
        { id: 'fin', h: 'Darte de baja', p: ['Puedes borrar tu cuenta cuando quieras desde Ajustes. Se borra todo al momento (y de las copias de seguridad en 30 días).'] },
        { id: 'ley', h: 'Ley aplicable', p: ['Se aplica la ley española. Si eres consumidor, puedes reclamar ante los tribunales de tu domicilio. Si cambiamos estos términos de forma importante te avisamos con 15 días de antelación.'] },
      ],
    },
    en: {
      title: 'Terms of use',
      intro: 'The rules for using BuildGolem. Written to be read in five minutes.',
      sections: [
        { id: 'quien', h: 'Who provides the service', p: [`BuildGolem (${OWNER.site}) is provided by ${OWNER.name}. Contact: ${OWNER.email}. BuildGolem is not affiliated with Mojang Studios or Microsoft; Minecraft is a Microsoft trademark.`] },
        { id: 'cuenta', h: 'Your account', list: [
          'You need to be 14 or older, or have your parents\' or guardians\' permission.',
          'You are responsible for what is done with your account, personal tokens and AI keys. If you think someone got in, change your password: it closes every session.',
          'You need a confirmed email to publish designs in the gallery.',
        ] },
        { id: 'contenido', h: 'What you upload and create', list: [
          'Your designs are yours. Making them public or sharing them by link lets us show them on BuildGolem while they stay that way; you can change visibility or delete them any time.',
          'Modpacks you upload must be yours or allowed to use. Mods, their textures and models belong to their authors: we only show publicly the textures of permissively licensed mods; the rest is seen only by the uploader.',
          'Do not upload anything illegal, infringing or containing malware.',
        ] },
        { id: 'ia', h: 'Agents and AI keys', list: [
          'Agents use your own key for the provider you choose. Cost, limits and that provider\'s terms are between you and them.',
          'Designs and calculations come from your modpack data, but can contain mistakes: check them before spending resources in your world.',
        ] },
        { id: 'uso', h: 'Fair use', list: [
          'Do not try to access other accounts, bypass limits, overload the server or use BuildGolem to attack others.',
          'Each account has a maximum space for modpacks (6 GB).',
          'We may suspend or delete accounts that break these terms, telling you when possible.',
        ] },
        { id: 'servicio', h: 'The service', p: [
          'BuildGolem is free and provided as is. We try to keep it running and to lose nothing, but there may be outages or changes. Keep your own copies of what matters (export .nbt or download your data from Settings).',
          'We are not liable for indirect damage or losses in your Minecraft world, except where the law does not allow excluding it: if you are a consumer, you keep every right the law gives you.',
        ] },
        { id: 'fin', h: 'Leaving', p: ['You can delete your account any time from Settings. Everything is deleted at once (and from backups within 30 days).'] },
        { id: 'ley', h: 'Governing law', p: ['Spanish law applies. If you are a consumer, you can bring claims before the courts where you live. If we change these terms in an important way we tell you 15 days in advance.'] },
      ],
    },
  },
};
