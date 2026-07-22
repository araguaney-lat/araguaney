"""Lista Modelo OMS de Medicamentos Esenciales, 23ª lista (2023) — subconjunto curado.

Módulo de datos puro para Araguaney: expone ``MEDICINES``, una lista de dicts
que describen medicamentos esenciales reales con formas farmacéuticas y
concentraciones plausibles, usada como datos semilla de referencia para
``ProductType``. Sigue las convenciones en español del seed existente
(`app/seeds/product_types.py`): INN en español, formas en español, concentración
sin espacios (p. ej. "500mg", "250mg/5ml", "100UI/ml").

Cada entrada tiene exactamente estas claves:
    category, inn_name, form, strength, display_name,
    default_unit, is_controlled, min_shelf_life_days

La tupla (inn_name, strength, form) es única en toda la lista y sirve como clave
determinista. ``is_controlled`` es True solo para estupefacientes/psicotrópicos
sujetos a fiscalización internacional.
"""


def _m(inn_name, form, strength, default_unit, is_controlled=False):
    return {
        "category": "MEDICINE",
        "inn_name": inn_name,
        "form": form,
        "strength": strength,
        "display_name": f"{inn_name} {strength} {form}",
        "default_unit": default_unit,
        "is_controlled": is_controlled,
        "min_shelf_life_days": 365,
    }


MEDICINES: list[dict] = [
    # --- Analgésicos, antipiréticos, AINE ---
    _m("Paracetamol", "tableta", "500mg", "tabletas"),
    _m("Paracetamol", "jarabe", "120mg/5ml", "frascos"),
    _m("Ácido acetilsalicílico", "tableta", "300mg", "tabletas"),
    _m("Ibuprofeno", "tableta", "400mg", "tabletas"),
    _m("Ibuprofeno", "jarabe", "100mg/5ml", "frascos"),
    _m("Diclofenaco", "tableta", "50mg", "tabletas"),
    _m("Diclofenaco", "solución inyectable", "25mg/ml", "ampolletas"),

    # --- Analgésicos opioides (fiscalizados) ---
    _m("Morfina", "solución inyectable", "10mg/ml", "ampolletas", is_controlled=True),
    _m("Morfina", "tableta", "10mg", "tabletas", is_controlled=True),
    _m("Codeína", "tableta", "30mg", "tabletas", is_controlled=True),
    _m("Tramadol", "cápsula", "50mg", "cápsulas", is_controlled=True),
    _m("Fentanilo", "solución inyectable", "50mcg/ml", "ampolletas", is_controlled=True),
    _m("Metadona", "jarabe", "5mg/5ml", "frascos", is_controlled=True),
    _m("Buprenorfina", "tableta", "2mg", "tabletas", is_controlled=True),
    _m("Naloxona", "solución inyectable", "0.4mg/ml", "ampolletas"),

    # --- Anestésicos, perioperatorio ---
    _m("Ketamina", "solución inyectable", "50mg/ml", "viales", is_controlled=True),
    _m("Lidocaína", "solución inyectable", "2%", "viales"),
    _m("Propofol", "solución inyectable", "10mg/ml", "viales"),
    _m("Atropina", "solución inyectable", "1mg/ml", "ampolletas"),

    # --- Antialérgicos ---
    _m("Clorfenamina", "tableta", "4mg", "tabletas"),
    _m("Loratadina", "tableta", "10mg", "tabletas"),
    _m("Cetirizina", "tableta", "10mg", "tabletas"),
    _m("Epinefrina", "solución inyectable", "1mg/ml", "ampolletas"),

    # --- Antídotos y desintoxicación ---
    _m("Acetilcisteína", "solución inyectable", "200mg/ml", "ampolletas"),
    _m("Carbón activado", "polvo oral", "50g", "sobres"),
    _m("Gluconato de calcio", "solución inyectable", "100mg/ml", "ampolletas"),
    _m("Flumazenil", "solución inyectable", "0.1mg/ml", "ampolletas"),

    # --- Anticonvulsivantes ---
    _m("Fenobarbital", "tableta", "100mg", "tabletas", is_controlled=True),
    _m("Diazepam", "solución inyectable", "5mg/ml", "ampolletas", is_controlled=True),
    _m("Diazepam", "tableta", "5mg", "tabletas", is_controlled=True),
    _m("Midazolam", "solución inyectable", "5mg/ml", "ampolletas", is_controlled=True),
    _m("Lorazepam", "solución inyectable", "4mg/ml", "ampolletas", is_controlled=True),
    _m("Fenitoína", "tableta", "100mg", "tabletas"),
    _m("Carbamazepina", "tableta", "200mg", "tabletas"),
    _m("Sulfato de magnesio", "solución inyectable", "500mg/ml", "ampolletas"),

    # --- Antibióticos: penicilinas ---
    _m("Amoxicilina", "cápsula", "250mg", "cápsulas"),
    _m("Amoxicilina", "cápsula", "500mg", "cápsulas"),
    _m("Amoxicilina", "suspensión", "250mg/5ml", "frascos"),
    _m("Amoxicilina + ácido clavulánico", "tableta", "625mg", "tabletas"),
    _m("Ampicilina", "solución inyectable", "500mg", "viales"),
    _m("Bencilpenicilina", "solución inyectable", "1g", "viales"),
    _m("Cloxacilina", "cápsula", "500mg", "cápsulas"),

    # --- Antibióticos: cefalosporinas ---
    _m("Cefalexina", "cápsula", "500mg", "cápsulas"),
    _m("Cefazolina", "solución inyectable", "1g", "viales"),
    _m("Ceftriaxona", "solución inyectable", "1g", "viales"),

    # --- Antibióticos: macrólidos ---
    _m("Azitromicina", "tableta", "500mg", "tabletas"),
    _m("Claritromicina", "tableta", "500mg", "tabletas"),

    # --- Antibióticos: quinolonas ---
    _m("Ciprofloxacino", "tableta", "500mg", "tabletas"),
    _m("Levofloxacino", "tableta", "500mg", "tabletas"),

    # --- Antibióticos: tetraciclinas y otros ---
    _m("Doxiciclina", "cápsula", "100mg", "cápsulas"),
    _m("Metronidazol", "tableta", "500mg", "tabletas"),
    _m("Metronidazol", "solución inyectable", "5mg/ml", "viales"),
    _m("Gentamicina", "solución inyectable", "40mg/ml", "ampolletas"),
    _m("Vancomicina", "solución inyectable", "500mg", "viales"),
    _m("Nitrofurantoína", "tableta", "100mg", "tabletas"),
    _m("Sulfametoxazol + trimetoprima", "tableta", "480mg", "tabletas"),

    # --- Antifúngicos ---
    _m("Fluconazol", "cápsula", "150mg", "cápsulas"),
    _m("Nistatina", "suspensión", "100000UI/ml", "frascos"),
    _m("Clotrimazol", "crema", "1%", "tubos"),
    _m("Anfotericina B", "solución inyectable", "50mg", "viales"),

    # --- Antivirales ---
    _m("Aciclovir", "tableta", "400mg", "tabletas"),
    _m("Aciclovir", "solución inyectable", "250mg", "viales"),
    _m("Oseltamivir", "cápsula", "75mg", "cápsulas"),

    # --- Antirretrovirales ---
    _m("Tenofovir + lamivudina + dolutegravir", "tableta", "300/300/50mg", "tabletas"),
    _m("Efavirenz", "tableta", "600mg", "tabletas"),
    _m("Nevirapina", "tableta", "200mg", "tabletas"),

    # --- Antipalúdicos ---
    _m("Arteméter + lumefantrina", "tableta", "20/120mg", "tabletas"),
    _m("Artesunato", "solución inyectable", "60mg", "viales"),
    _m("Cloroquina", "tableta", "150mg", "tabletas"),

    # --- Antituberculosos ---
    _m("Isoniazida", "tableta", "300mg", "tabletas"),
    _m("Rifampicina", "tableta", "300mg", "tabletas"),
    _m("Etambutol", "tableta", "400mg", "tabletas"),
    _m("Pirazinamida", "tableta", "500mg", "tabletas"),
    _m("Rifampicina + isoniazida", "tableta", "150/75mg", "tabletas"),

    # --- Antiparasitarios ---
    _m("Albendazol", "tableta", "400mg", "tabletas"),
    _m("Mebendazol", "tableta", "500mg", "tabletas"),
    _m("Ivermectina", "tableta", "3mg", "tabletas"),

    # --- Cardiovascular ---
    _m("Enalapril", "tableta", "10mg", "tabletas"),
    _m("Amlodipino", "tableta", "5mg", "tabletas"),
    _m("Atenolol", "tableta", "50mg", "tabletas"),
    _m("Bisoprolol", "tableta", "5mg", "tabletas"),
    _m("Hidroclorotiazida", "tableta", "25mg", "tabletas"),
    _m("Furosemida", "tableta", "40mg", "tabletas"),
    _m("Furosemida", "solución inyectable", "10mg/ml", "ampolletas"),
    _m("Espironolactona", "tableta", "25mg", "tabletas"),
    _m("Losartán", "tableta", "50mg", "tabletas"),
    _m("Digoxina", "tableta", "0.25mg", "tabletas"),
    _m("Atorvastatina", "tableta", "20mg", "tabletas"),
    _m("Trinitrato de glicerilo", "tableta", "0.5mg", "tabletas"),
    _m("Warfarina", "tableta", "5mg", "tabletas"),
    _m("Heparina", "solución inyectable", "5000UI/ml", "viales"),
    _m("Clopidogrel", "tableta", "75mg", "tabletas"),

    # --- Gastrointestinal ---
    _m("Omeprazol", "cápsula", "20mg", "cápsulas"),
    _m("Hidróxido de aluminio + hidróxido de magnesio", "suspensión", "N/A", "frascos"),
    _m("Ondansetrón", "tableta", "8mg", "tabletas"),
    _m("Ondansetrón", "solución inyectable", "2mg/ml", "ampolletas"),
    _m("Metoclopramida", "tableta", "10mg", "tabletas"),
    _m("Loperamida", "cápsula", "2mg", "cápsulas"),
    _m("Sales de rehidratación oral", "polvo oral", "20.5g", "sobres"),
    _m("Bisacodilo", "tableta", "5mg", "tabletas"),

    # --- Respiratorio ---
    _m("Salbutamol", "inhalador", "100mcg", "frascos"),
    _m("Salbutamol", "jarabe", "2mg/5ml", "frascos"),
    _m("Beclometasona", "inhalador", "100mcg", "frascos"),
    _m("Bromuro de ipratropio", "inhalador", "20mcg", "frascos"),

    # --- Diabetes ---
    _m("Insulina humana soluble", "solución inyectable", "100UI/ml", "viales"),
    _m("Insulina isofana", "solución inyectable", "100UI/ml", "viales"),
    _m("Metformina", "tableta", "500mg", "tabletas"),
    _m("Metformina", "tableta", "850mg", "tabletas"),
    _m("Gliclazida", "tableta", "80mg", "tabletas"),
    _m("Glucagón", "solución inyectable", "1mg", "viales"),

    # --- Corticoides y hormonas ---
    _m("Hidrocortisona", "solución inyectable", "100mg", "viales"),
    _m("Prednisolona", "tableta", "5mg", "tabletas"),
    _m("Dexametasona", "solución inyectable", "4mg/ml", "ampolletas"),
    _m("Dexametasona", "tableta", "0.5mg", "tabletas"),
    _m("Levotiroxina", "tableta", "100mcg", "tabletas"),

    # --- Vitaminas y minerales ---
    _m("Retinol", "cápsula", "200000UI", "cápsulas"),
    _m("Colecalciferol", "tableta", "1000UI", "tabletas"),
    _m("Ácido ascórbico", "tableta", "500mg", "tabletas"),
    _m("Tiamina", "tableta", "100mg", "tabletas"),
    _m("Ácido fólico", "tableta", "5mg", "tabletas"),
    _m("Sulfato ferroso", "tableta", "200mg", "tabletas"),
    _m("Sulfato ferroso + ácido fólico", "tableta", "60/0.4mg", "tabletas"),
    _m("Sulfato de zinc", "tableta", "20mg", "tabletas"),
    _m("Fitomenadiona", "solución inyectable", "10mg/ml", "ampolletas"),

    # --- Dermatológicos ---
    _m("Sulfadiazina de plata", "crema", "1%", "tubos"),
    _m("Betametasona", "crema", "0.1%", "tubos"),
    _m("Miconazol", "crema", "2%", "tubos"),
    _m("Benzoato de bencilo", "crema", "25%", "tubos"),
    _m("Permetrina", "crema", "5%", "tubos"),

    # --- Oftalmológicos ---
    _m("Tetraciclina", "pomada", "1%", "tubos"),
    _m("Cloranfenicol", "gotas oftálmicas", "0.5%", "frascos"),
    _m("Ciprofloxacino", "gotas oftálmicas", "0.3%", "frascos"),
    _m("Timolol", "gotas oftálmicas", "0.5%", "frascos"),

    # --- Psicoterapéuticos ---
    _m("Amitriptilina", "tableta", "25mg", "tabletas"),
    _m("Fluoxetina", "cápsula", "20mg", "cápsulas"),
    _m("Haloperidol", "tableta", "5mg", "tabletas"),
    _m("Haloperidol", "solución inyectable", "5mg/ml", "ampolletas"),
    _m("Clorpromazina", "tableta", "100mg", "tabletas"),
    _m("Risperidona", "tableta", "2mg", "tabletas"),
    _m("Carbonato de litio", "tableta", "300mg", "tabletas"),

    # --- Oxitócicos / salud reproductiva ---
    _m("Oxitocina", "solución inyectable", "10UI/ml", "ampolletas"),
    _m("Ergometrina", "solución inyectable", "0.2mg/ml", "ampolletas"),
    _m("Misoprostol", "tableta", "200mcg", "tabletas"),

    # --- Anticonceptivos ---
    _m("Levonorgestrel", "tableta", "1.5mg", "tabletas"),
    _m("Etinilestradiol + levonorgestrel", "tableta", "30/150mcg", "tabletas"),
    _m("Acetato de medroxiprogesterona", "solución inyectable", "150mg/ml", "viales"),

    # --- Soluciones intravenosas ---
    _m("Cloruro de sodio", "solución inyectable", "0.9%", "frascos"),
    _m("Glucosa", "solución inyectable", "5%", "frascos"),
    _m("Glucosa", "solución inyectable", "50%", "viales"),
    _m("Lactato de sodio compuesto", "solución inyectable", "N/A", "frascos"),
    _m("Cloruro de potasio", "solución inyectable", "15%", "ampolletas"),
    _m("Agua para inyección", "solución inyectable", "N/A", "ampolletas"),

    # --- Inmunológicos y varios ---
    _m("Antitoxina tetánica", "solución inyectable", "1500UI", "ampolletas"),
    _m("Hidroxocobalamina", "solución inyectable", "1mg/ml", "ampolletas"),
]
