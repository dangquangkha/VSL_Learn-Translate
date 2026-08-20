package com.vsl.modelregistry;

import com.vsl.auth.exception.GlobalExceptionHandler;
import com.vsl.auth.security.JwtAuthenticationFilter;
import com.vsl.auth.security.JwtTokenProvider;
import com.vsl.auth.security.RestAccessDeniedHandler;
import com.vsl.auth.security.RestAuthenticationEntryPoint;
import com.vsl.auth.security.SecurityConfig;
import com.vsl.common.api.ApiException;
import com.vsl.common.api.CorrelationIdFilter;
import com.vsl.modelregistry.controller.AdminModelController;
import com.vsl.modelregistry.controller.ModelRegistryController;
import com.vsl.modelregistry.service.ModelRegistryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.matchesPattern;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminModelController.class, ModelRegistryController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class,
        RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        CorrelationIdFilter.class, GlobalExceptionHandler.class})
class ModelRegistryWebSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ModelRegistryService registry;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void anonymousAdminRequestReturnsStable401Body() throws Exception {
        mockMvc.perform(get("/api/admin/models"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.correlationId", matchesPattern(
                        "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")))
                .andExpect(header().exists("X-Correlation-Id"));
    }

    @Test
    @WithMockUser(authorities = "LEARNER")
    void authenticatedNonAdminRequestReturnsStable403Body() throws Exception {
        mockMvc.perform(get("/api/admin/models"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @WithMockUser(authorities = "ADMIN")
    void adminCanReadModelHistory() throws Exception {
        when(registry.history(org.mockito.ArgumentMatchers.any())).thenReturn(Page.empty());

        mockMvc.perform(get("/api/admin/models"))
                .andExpect(status().isOk());
    }

    @Test
    void publicActiveModelRouteIsPermitAllAndUsesStable404() throws Exception {
        when(registry.getActiveModel()).thenThrow(new ApiException(
                HttpStatus.NOT_FOUND, "NO_ACTIVE_MODEL", "No model is currently active"));

        mockMvc.perform(get("/api/model/active"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NO_ACTIVE_MODEL"));
    }
}
