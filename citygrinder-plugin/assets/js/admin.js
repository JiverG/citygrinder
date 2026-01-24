/**
 * CityGrinder Admin Scripts
 *
 * @package CityGrinder
 * @version 1.0.0
 */

(function($) {
    'use strict';

    // Admin page functionality
    $(document).ready(function() {
        // Settings page enhancements
        $('.citygrinder-settings-form').on('submit', function() {
            // Add any validation here
            return true;
        });

        // Confirm delete actions
        $('[data-action="delete"]').on('click', function(e) {
            if (!confirm('Are you sure you want to delete this item?')) {
                e.preventDefault();
                return false;
            }
        });
    });

})(jQuery);
