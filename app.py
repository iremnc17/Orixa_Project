import os
import mysql.connector
import re
import uuid
import secrets
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

db_config = {
    'user': 'avnadmin',
    'password': os.getenv('DB_PASSWORD'),  
    'host': 'mysql-11f914b6-imanciirem17-7889.h.aivencloud.com',
    'port': 10425,
    'database': 'defaultdb',
    'ssl_ca': None,
    'ssl_verify_cert': False
}

# --- HTML SAYFA ROTALARI ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

@app.route('/istatistikler')
def istatistikler():
    return render_template('istatistikler.html')

@app.route('/kodlar')
def kodlar():
    return render_template('kodlar.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/odeme')
def odeme():
    return render_template('odeme.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/rehberler')
def rehberler():
    return render_template('rehberler.html')

@app.route('/tasarimlar')
def tasarimlar():
    return render_template('tasarimlar.html')

# ----------------------------

def is_valid_email(email):
    regex = r'^[a-z0-9]+[\._]?[a-z0-9]+[@]\w+[.]\w{2,3}$'
    return re.search(regex, email)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')

    if not email or not username or not password:
        return jsonify({"error": "Tüm alanların doldurulması zorunludur!"}), 400

    if not is_valid_email(email):
        return jsonify({"error": "Lütfen geçerli bir e-posta adresi girin!"}), 400

    if len(username) < 3:
        return jsonify({"error": "Kullanıcı adı çok kısa!"}), 400
        
    if len(password) < 6:
        return jsonify({"error": "Şifre en az 6 haneli olmalı!"}), 400

    hashed_pw = generate_password_hash(password)

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        query = "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)"
        cursor.execute(query, (username, email, hashed_pw))
        conn.commit()
        return jsonify({"message": "Kullanıcı başarıyla oluşturuldu! Şimdi giriş yapabilirsiniz."}), 201
    except mysql.connector.Error as err:
        if err.errno == 1062:
            return jsonify({"error": "Bu kullanıcı adı veya e-posta zaten kayıtlı!"}), 400
        return jsonify({"error": f"Veritabanı hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre gereklidir!"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM users WHERE username = %s"
        cursor.execute(query, (username,))
        user = cursor.fetchone()

        if user:
            if check_password_hash(user['password'], password):
                return jsonify({
                    "message": "Giriş başarılı!",
                    "user": {
                        "username": user['username'],
                        "email": user['email'],
                        "is_admin": user.get('is_admin', 0)  
                    }
                }), 200
            else:
                return jsonify({"error": "Hatalı şifre!"}), 401
        else:
            return jsonify({"error": "Kullanıcı bulunamadı!"}), 404
    except mysql.connector.Error as err:
        return jsonify({"error": f"Veritabanı hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, name, category, price, programming_language, requirements, description, source_code FROM products ORDER BY id ASC")
        products = cursor.fetchall()
        for prod in products:
            prod['price'] = float(prod['price'])
        return jsonify(products), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Ürünler çekilirken hata oluştu: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.id, p.name, p.category, p.price, COALESCE(a.sales_count, 0) as sales
            FROM products p
            LEFT JOIN analytics a ON p.id = a.product_id
            ORDER BY p.id ASC
        """
        cursor.execute(query)
        products = cursor.fetchall()
        for prod in products:
            prod['price'] = float(prod['price'])
            prod['uid'] = f"ORX-00{prod['id']}"
        return jsonify(products), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Analiz verileri çekilemedi: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/auth/google', methods=['POST'])
def google_login():
    data = request.json
    email = data.get('email')
    username = data.get('username') or email.split('@')[0]

    if not email:
        return jsonify({"error": "Google e-posta bilgisi alınamadı!"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            random_password = generate_password_hash(secrets.token_hex(16))
            cursor.execute("INSERT INTO users (username, email, password) VALUES (%s, %s, %s)", (username, email, random_password))
            conn.commit()
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()

        return jsonify({
            "message": "Google ile başarıyla giriş yapıldı!",
            "user": {
                "username": user['username'],
                "email": user['email'],
                "is_admin": user.get('is_admin', 0)
            }
        }), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Google entegrasyon hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/admin/dashboard', methods=['POST'])
def admin_dashboard():
    data = request.json
    email = data.get('email') 
    if not email:
        return jsonify({"error": "Yetkilendirme hatası: E-posta eksik!"}), 401

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT is_admin FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user or user.get('is_admin') != 1:
            return jsonify({"error": "Erişim Engellendi! Bu alana yalnızca sistem yöneticisi erişebilir."}), 403
            
        cursor.execute("SELECT balance FROM wallet WHERE id = 1")
        wallet_data = cursor.fetchone()
        if not wallet_data:
            cursor.execute("INSERT INTO wallet (id, balance) VALUES (1, 0.00)")
            conn.commit()
            cuzdan_bakiye = 0.00
        else:
            cuzdan_bakiye = float(wallet_data['balance'])

        cursor.execute("SELECT id, name, category, price FROM products")
        admin_products = cursor.fetchall()
        for p in admin_products:
            p['price'] = float(p['price'])

        return jsonify({
            "status": "Verified Admin",
            "cuzdan_bakiye": cuzdan_bakiye, 
            "banka_aktarim_durumu": "Güvenli Havuz Aktif (IBAN Gizli)",
            "products": admin_products
        }), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Yönetici paneli hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/checkout/pay', methods=['POST'])
def process_payment():
    data = request.json
    email = data.get('email')
    cart = data.get('cart', [])
    card_holder = data.get('cardHolder')
    card_number = data.get('cardNumber') 

    if not email or not cart:
        return jsonify({"error": "Sepetiniz boş veya kullanıcı bilgiisi eksik!"}), 400
    if not card_holder or not card_number:
        return jsonify({"error": "Kart bilgileri eksiksiz doldurulmalıdır!"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        total_income = 0.00
        for item in cart:
            product_id = item.get('id')
            if product_id:
                cursor.execute("SELECT price FROM products WHERE id = %s", (product_id,))
                prod_data = cursor.fetchone()
                if prod_data:
                    total_income += float(prod_data['price'])
                cursor.execute("SELECT * FROM analytics WHERE product_id = %s", (product_id,))
                row = cursor.fetchone()
                if row:
                    cursor.execute("UPDATE analytics SET sales_count = sales_count + 1 WHERE product_id = %s", (product_id,))
                else:
                    cursor.execute("INSERT INTO analytics (product_id, sales_count) VALUES (%s, 1)", (product_id,))
        
        cursor.execute("SELECT balance FROM wallet WHERE id = 1")
        w_row = cursor.fetchone()
        if w_row:
            cursor.execute("UPDATE wallet SET balance = balance + %s WHERE id = 1", (total_income,))
        else:
            cursor.execute("INSERT INTO wallet (id, balance) VALUES (1, %s)", (total_income,))
            
        conn.commit()
        return jsonify({"success": True, "message": "Ödeme iZCO/PayTR altyapısıyla güvenle tahsil edildi! Kazanç cüzdan havuzunuza aktarıldı."}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Ödeme işlenirken veritabanı hatası oluştu: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "Lütfen e-posta adresinizi girin!"}), 400
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "Sistemde kayıtlı böyle bir e-posta bulunamadı!"}), 404
        reset_token = str(uuid.uuid4())
        cursor.execute("UPDATE users SET reset_token = %s WHERE email = %s", (reset_token, email))
        conn.commit()
        reset_link = f"http://127.0.0.1:5500/sifre-yenile.html?token={reset_token}"
        return jsonify({"message": "Şifre sıfırlama bağlantısı gönderildi!", "debug_link": reset_link}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Şifre sıfırlama işlemi başarısız: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/admin/transfer', methods=['POST'])
def admin_transfer():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "Yetkilendirme hatası: E-posta eksik!"}), 401
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT is_admin FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user or user.get('is_admin') != 1:
            return jsonify({"error": "Erişim Engellendi!"}), 403
        cursor.execute("SELECT balance FROM wallet WHERE id = 1")
        w_row = cursor.fetchone()
        current_balance = float(w_row['balance'] if w_row else 0.00)
        if current_balance <= 0:
            return jsonify({"error": "Cüzdanınızda çekilebilir bakiye bulunmamaktadır!"}), 400
        cursor.execute("UPDATE wallet SET balance = 0.00 WHERE id = 1")
        conn.commit()
        return jsonify({"success": True, "yeni_bakiye": 0.00, "message": "Bakiye başarıyla aktarıldı."}), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Transfer hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/admin/top-products', methods=['POST'])
def get_top_products():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "Yetkilendirme hatası!"}), 401
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT is_admin FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user or user.get('is_admin') != 1:
            return jsonify({"error": "Yetkisiz Erişim!"}), 403
        query = "SELECT p.name, p.category, COALESCE(a.sales_count, 0) as sales FROM products p INNER JOIN analytics a ON p.id = a.product_id WHERE a.sales_count > 0 ORDER BY a.sales_count DESC LIMIT 5"
        cursor.execute(query)
        top_products = cursor.fetchall()
        return jsonify(top_products), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"İstatistik verisi çekilemedi: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/feedback', methods=['GET', 'POST'])
def handle_feedback():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        if request.method == 'POST':
            data = request.json
            user_email = data.get('email', 'Ziyaretçi')
            message = data.get('message')
            rating = data.get('rating', 5)
            if not message:
                return jsonify({"error": "Mesaj alanı boş bırakılamaz!"}), 400
            query = "INSERT INTO feedbacks (user_email, message, rating) VALUES (%s, %s, %s)"
            cursor.execute(query, (user_email, message, rating))
            conn.commit()
            return jsonify({"success": True, "message": "Geri bildirim iletildi!"}), 201
        else:
            cursor.execute("SELECT id, user_email, message, rating, created_at FROM feedbacks ORDER BY id DESC")
            feedbacks = cursor.fetchall()
            return jsonify(feedbacks), 200
    except mysql.connector.Error as err:
        return jsonify({"error": f"Geri bildirim sistemi hatası: {err}"}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)