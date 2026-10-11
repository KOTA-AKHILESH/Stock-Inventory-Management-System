"""Run with python -m unittest discover -s backend (from the project root)."""
import os
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

TEMP = tempfile.TemporaryDirectory()
os.environ['INVENTORY_DB'] = str(Path(TEMP.name) / 'test.db')
import main


class InventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.employee = TestClient(main.app)
        cls.admin = TestClient(main.app)
        cls.super = TestClient(main.app)
        for name, client, role in [('worker', cls.employee, 'employee'), ('manager', cls.admin, 'admin'), ('owner', cls.super, 'super_admin')]:
            assert client.post('/register', json={'name': name, 'email': f'{name}@example.com', 'password': 'testpass123', 'role': 'employee'}).status_code == 200
            with main.get_connection() as c:
                c.execute('UPDATE users SET role=? WHERE email=?', (role, f'{name}@example.com'))
            assert client.post('/login', json={'email': f'{name}@example.com', 'password': 'testpass123'}).status_code == 200

    def test_access(self):
        anonymous = TestClient(main.app)
        self.assertEqual(anonymous.get('/products').status_code, 401)
        self.assertEqual(self.employee.get('/users').status_code, 403)
        self.assertEqual(self.admin.get('/users').status_code, 403)
        self.assertEqual(self.super.get('/users').status_code, 200)
        self.assertEqual(self.employee.post('/products', json={'name':'x','category':'x','quantity':1,'price':2,'supplier':'x'}).status_code, 403)
        self.assertEqual(anonymous.post('/register', json={'name':'intruder','email':'intruder@example.com','password':'testpass123','role':'super_admin'}).status_code, 403)

    def test_product_lifecycle(self):
        product={'name':'Keyboard','category':'Electronics','quantity':5,'price':100.5,'supplier':'Acme'}
        response=self.admin.post('/products',json=product)
        self.assertEqual(response.status_code,200)
        pid=response.json()['product_id']
        self.assertEqual(self.employee.patch(f'/products/{pid}/quantity',json={'change':-6}).status_code,400)
        self.assertEqual(self.employee.patch(f'/products/{pid}/quantity',json={'change':4}).json()['quantity'],9)
        product['price']=200
        self.assertEqual(self.super.put(f'/products/{pid}',json=product).status_code,200)
        self.assertEqual(self.admin.post('/products',json={**product,'quantity':-1}).status_code,422)
        self.assertEqual(self.admin.post('/products',json={**product,'name':'  '}).status_code,422)
        self.assertEqual(self.admin.post('/products',json={**product,'quantity':1.5}).status_code,422)
        self.assertEqual(self.admin.delete(f'/products/{pid}').status_code,200)
        self.assertEqual(self.admin.delete(f'/products/{pid}').status_code,404)

    def test_login_and_logout(self):
        client=TestClient(main.app)
        self.assertEqual(client.post('/login',json={'email':'worker@example.com','password':'wrong'}).status_code,401)
        self.assertEqual(client.post('/login',json={'email':'worker@example.com','password':'testpass123'}).status_code,200)
        self.assertEqual(client.get('/me').json()['role'],'employee')
        self.assertEqual(client.post('/logout').status_code,200)
        self.assertEqual(client.get('/me').status_code,401)

    def test_roles(self):
        own=self.super.get('/me').json()['id']
        worker=self.employee.get('/me').json()['id']
        self.assertEqual(self.super.patch(f'/users/{own}/role',json={'role':'employee'}).status_code,400)
        self.assertEqual(self.admin.patch(f'/users/{worker}/role',json={'role':'admin'}).status_code,403)
        self.assertEqual(self.super.patch(f'/users/{worker}/role',json={'role':'admin'}).status_code,200)
        self.assertEqual(self.employee.get('/me').json()['role'],'admin')
        self.super.patch(f'/users/{worker}/role',json={'role':'employee'})

    def test_frontend_serving(self):
        self.assertEqual(self.employee.get('/app/').status_code,200)
        self.assertEqual(self.employee.get('/app/admin.js').status_code,200)


if __name__ == '__main__':
    unittest.main()
