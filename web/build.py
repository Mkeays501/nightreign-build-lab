import pathlib,json
root=pathlib.Path(__file__).parent
save_items=json.loads((root/'src/save-items.json').read_text())
data=json.loads((root/'src/data.json').read_text())
s=(root/'src/index.template.html').read_text().replace('/*STYLE*/',(root/'src/style.css').read_text()).replace('/*DATA*/','const NR='+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')+';const SAVE_ITEMS='+json.dumps(save_items,separators=(',',':'))+';').replace('/*ENGINE*/',((root/'src/inventory.mjs').read_text()+'\n'+(root/'src/engine.mjs').read_text()+'\n'+(root/'src/weapon-engine.mjs').read_text().replace("import {effectConditionActive} from './engine.mjs';\n",'')+'\n'+(root/'src/optimizer.mjs').read_text().replace("import {vesselsFor,canFit,validateRelic,calculate} from './engine.mjs';\n",'').replace("import {calculateArmament,resolveWeaponVariant} from './weapon-engine.mjs';\n",'')).replace('export ','')).replace('/*APP*/',(root/'src/app.js').read_text().replace('/*WEAPON_UI*/',(root/'src/weapon-ui.js').read_text()))
(root/'dist').mkdir(exist_ok=True)
(root/'dist/index.html').write_text(s)
(root/'dist/.nojekyll').touch()
print(json.dumps({'bytes':len(s.encode()),'characters':len(data['characters']),'relics':len(data['fixedRelics']),'effects':len(data['effects'])}))
