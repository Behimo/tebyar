FROM registry-pishgaman.runflare.com/public/laravel-nginx-php84:2026-10-21

WORKDIR /var/www

COPY --chown=www:www-data apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY --chown=www:www-data apps/api/ ./

RUN cp .env.example .env \
    && sed -i 's/^APP_ENV=.*/APP_ENV=production/; s/^APP_DEBUG=.*/APP_DEBUG=false/' .env \
    && composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && php artisan key:generate --force --ansi

RUN if command -v npm >/dev/null 2>&1; then \
        npm install --ignore-scripts && npm run build && rm -rf node_modules; \
    fi

RUN chown -R www:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 80

CMD ["sh", "-c", "php-fpm -D && exec nginx -g 'daemon off;'"]
