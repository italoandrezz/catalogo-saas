package com.catalogo.api.service;

import com.catalogo.api.exception.ResourceNotFoundException;
import com.catalogo.api.model.dto.CustomerRequest;
import com.catalogo.api.model.entity.Customer;
import com.catalogo.api.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CurrentTenantService currentTenantService;

    public List<Customer> listAll() {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        return customerRepository.findByTenantId(tenantId);
    }

    public Customer create(CustomerRequest request) {
        Customer customer = new Customer();
        customer.setTenant(currentTenantService.getCurrentTenant());
        customer.setName(request.name());
        customer.setEmail(normalizeEmail(request.email()));
        customer.setPhone(normalizePhone(request.phone()));
        return customerRepository.save(customer);
    }

    public Customer update(UUID id, CustomerRequest request) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        Customer customer = customerRepository.findById(id)
                .filter(item -> item.getTenant().getId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));

        customer.setName(request.name());
        customer.setEmail(normalizeEmail(request.email()));
        customer.setPhone(normalizePhone(request.phone()));
        return customerRepository.save(customer);
    }

    public void delete(UUID id) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        Customer customer = customerRepository.findById(id)
                .filter(item -> item.getTenant().getId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        customerRepository.delete(customer);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }

        String digits = phone.replaceAll("\\D", "");

        if (digits.startsWith("55")) {
            digits = digits.substring(2);
        }

        if (digits.length() == 10) {
            return "+55 (" + digits.substring(0, 2) + ") " + digits.substring(2, 6) + "-" + digits.substring(6);
        }

        if (digits.length() == 11) {
            return "+55 (" + digits.substring(0, 2) + ") " + digits.substring(2, 7) + "-" + digits.substring(7);
        }

        return phone.trim();
    }
}
