import urllib.request
import urllib.error

url = 'https://rylbznbtrrsuyzxgsivg.supabase.co/rest/v1/parceiros?select=*&order=ordem.asc'
headers = {
    'apikey': 'sb_publishable_3xR7VpxN0s-nIgn6t2COGA_3n9dnoBC',
    'Authorization': 'Bearer sb_publishable_3xR7VpxN0s-nIgn6t2COGA_3n9dnoBC',
    'Accept': 'application/json'
}
req = urllib.request.Request(url, headers=headers)
try:
    resp = urllib.request.urlopen(req)
    print('STATUS', resp.status)
    print('CONTENT-TYPE', resp.getheader('Content-Type'))
    print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('ERR', type(e).__name__, e)
