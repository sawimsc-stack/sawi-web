# SawI Web — guía de despliegue

Web estática (`index.html`) + una pequeña función serverless (`api/brevo-subscribe.js`)
que conecta los formularios con tu cuenta de Brevo. La API key vive solo en Vercel,
nunca en el navegador.

---

## 1. Configurar Brevo (10 minutos)

### 1.1 Crear la lista
1. Entra en Brevo → **Contactos** → **Listas** → **Crear lista**.
2. Nombre: `SawI Web`.
3. Una vez creada, fíjate en su **ID** (el número que aparece junto al nombre, p. ej. `3`).
   Ese número va luego en Vercel como `BREVO_LIST_ID`.

### 1.2 Crear los atributos personalizados
En **Contactos → Configuración → Atributos de contacto** crea estos atributos
(todos de tipo *Texto* salvo el último, que es *Booleano*):

| Atributo     | Tipo     | Para qué sirve                                            |
|--------------|----------|-----------------------------------------------------------|
| `NOMBRE`     | Texto    | Nombre o nombre artístico                                 |
| `ORIGEN`     | Texto    | `ebook`, `newsletter` o `cualificacion`                   |
| `EBOOK`      | Texto    | Cuál ebook descargó: `Sidechain`, `Dinámica` o `Canto`    |
| `GENERO`     | Texto    | Género del formulario de cualificación                    |
| `SERVICIO`   | Texto    | Servicio que necesita                                      |
| `PROYECTO`   | Texto    | Estado del proyecto                                        |
| `INVERSION`  | Texto    | Si está dispuesto a invertir (`si` / `no`)                 |
| `CUALIFICADO`| Booleano | Lead cualificado para WhatsApp                             |

### 1.3 Generar la API key
**Configuración (icono usuario arriba-derecha) → SMTP & API → API Keys → Generate a new API key**.
- Nombre: `SawI Web`
- Copia la clave (`xkeysib-...`). La pegarás en Vercel en el siguiente paso. **No la pegues en ningún chat ni en el código.**

### 1.4 Crear las plantillas y la automatización del email del ebook
En **Campañas → Plantillas → Nueva plantilla** crea una plantilla por cada ebook
(o una sola con un campo dinámico `{{ contact.EBOOK }}` que decida el adjunto).

Después en **Automatizaciones → Crear flujo**:
- Disparador: *Un contacto entra en la lista `SawI Web`*
- Filtro: `ATTRIBUTE.ORIGEN` = `ebook`
- Acción: enviar plantilla (con el PDF del ebook adjunto)

Repite con otro flujo para `ORIGEN = newsletter` (email de bienvenida) y otro para
`ORIGEN = cualificacion` con `CUALIFICADO = true` (avisarte a ti del nuevo lead).

---

## 2. Subir la web a Vercel

### 2.1 Crear cuenta
1. Entra en [vercel.com](https://vercel.com) → **Sign up**.
2. Lo más fácil: continuar con GitHub, GitLab o Google.

### 2.2 Subir esta carpeta como proyecto
**Opción A — Drag & drop (más fácil, sin git):**
1. Vercel → **Add New** → **Project** → **Browse** → arrastra TODA la carpeta `SawI Web` (con `index.html` y la subcarpeta `api/`).
2. *Framework Preset*: deja **Other**.
3. *Root Directory*: deja en blanco.
4. **Deploy**.

**Opción B — GitHub (recomendado a medio plazo):**
1. Crea un repo en GitHub llamado `sawi-web`, sube los archivos.
2. En Vercel **Add New → Project** y conecta el repo.

### 2.3 Configurar las variables de entorno
Una vez creado el proyecto en Vercel:
1. **Settings → Environment Variables**.
2. Añade dos variables (`Production`, `Preview` y `Development` marcadas las tres):
   - `BREVO_API_KEY` = tu clave `xkeysib-...`
   - `BREVO_LIST_ID` = el número de la lista (p. ej. `3`)
3. **Save**.
4. Vuelve a **Deployments → ⋯ → Redeploy** para que la función coja las variables.

### 2.4 Probar
1. Entra en la URL que te da Vercel (`sawi-xxxx.vercel.app`).
2. Suscríbete con un email tuyo desde el formulario del newsletter o desde un ebook.
3. En Brevo → Contactos verás el contacto con todos los atributos rellenos.
4. Si la automatización está activa, recibirás el email del ebook.

### 2.5 Conectar el dominio (cuando lo compres)
1. Compra `sawi.es` en Porkbun o Namecheap.
2. Vercel → **Settings → Domains → Add** → escribe `sawi.es`.
3. Sigue las instrucciones (te dirá qué registros DNS poner). Tarda unos minutos.

---

## 3. ¿Qué hace cada archivo?

| Archivo                       | Para qué sirve                                                 |
|-------------------------------|-----------------------------------------------------------------|
| `index.html`                  | La web completa (todo el diseño, vídeos, fotos, scripts)        |
| `api/brevo-subscribe.js`      | Función serverless. Recibe los datos del formulario y los manda a Brevo de forma segura. |
| `vercel.json`                 | Configuración de Vercel (cabeceras de seguridad básicas).       |
| `package.json`                | Declara que el proyecto usa Node 18 (para la función).          |
| `.env.example`                | Plantilla de variables. **No metas aquí los valores reales.**   |
| `.gitignore`                  | Lo que se excluye de git.                                        |

---

## 4. Probar la función en local (opcional)

Si más adelante quieres tocar código:
```bash
npm i -g vercel
vercel dev
```
Te levanta `index.html` + `/api/brevo-subscribe` en `http://localhost:3000`.
Necesitarás un `.env.local` con tus dos variables (no lo subas a git).

---

## 5. Checklist final antes de lanzar

- [ ] Lista `SawI Web` creada en Brevo
- [ ] Atributos creados (8 atributos)
- [ ] API key generada y guardada en Vercel (`BREVO_API_KEY`)
- [ ] List ID guardado en Vercel (`BREVO_LIST_ID`)
- [ ] Plantilla de bienvenida + automatización de cada ebook activadas
- [ ] Probado un alta real desde la web → contacto aparece en Brevo
- [ ] Email de confirmación llega a la bandeja
- [ ] Dominio conectado (cuando lo tengas)
